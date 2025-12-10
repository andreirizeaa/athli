from typing import Optional, Dict, Any
from urllib.parse import urlparse
import httpx
import subprocess
import shutil
import tempfile
import os

# Limit OpenCV and BLAS threads to prevent CPU oversubscription
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import cv2
try:
    cv2.setNumThreads(1)
except Exception:
    pass

import mediapipe as mp
import numpy as np
from google import genai
import json
import re
import time
import uuid
import concurrent.futures
from datetime import datetime, timezone
import ast
from .prompts import get_validation_and_analysis_prompt
from utils.logger import analysis_logger, log_with_context
from db_helpers import jobs_upsert, utcnow_iso

# Robust JSON parsing helpers
_JSON_COMMENT_RE = re.compile(r"(?m)//[^\n]*|/\*.*?\*/", re.S)
_TRAILING_COMMA_RE = re.compile(r",\s*([}\]])")
_SMART_QUOTES = str.maketrans({
    "\u201c": "\"",  # Left double quotation mark
    "\u201d": "\"",  # Right double quotation mark  
    "\u2018": "'",   # Left single quotation mark
    "\u2019": "'"    # Right single quotation mark
})
_BOM = "\ufeff"

def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        # remove leading ```(json)? and trailing ```
        s = s.strip("`")
        if s.startswith("json\n"):
            s = s[5:]
    return s.strip()

def _extract_json_block(s: str) -> str:
    """Find the largest balanced {...} block (fallback to [...] if needed)."""
    s = s.strip()
    # Prefer object
    first = s.find("{")
    last  = s.rfind("}")
    if first != -1 and last != -1 and last > first:
        return s[first:last+1]
    # Fallback to array
    first = s.find("[")
    last  = s.rfind("]")
    if first != -1 and last != -1 and last > first:
        return s[first:last+1]
    return s

def _fix_trailing_commas(s: str) -> str:
    # Removes trailing commas like {"a":1,} or [1,2,]
    return _TRAILING_COMMA_RE.sub(r"\1", s)

def _remove_js_comments(s: str) -> str:
    return _JSON_COMMENT_RE.sub("", s)

def _replace_nan_inf(s: str) -> str:
    # JSON doesn't allow NaN/Infinity
    return re.sub(r'\bNaN\b|\bInfinity\b|-Infinity', 'null', s)

_SINGLE2DOUBLE_RE = re.compile(r'(?P<prefix>[:\[{,\s])\s*\'(?P<content>(?:\\\'|[^\'\n])*?)\'\s*(?P<suffix>[,\}\]])')

def _single_to_double_quoted_strings(s: str) -> str:
    """
    Convert single-quoted JSON-like strings/keys to double-quoted
    without touching apostrophes inside words. Works by only replacing
    tokens immediately after {,[,: or ,  and before ,}] .
    """
    def repl(m: re.Match) -> str:
        content = m.group("content").replace('\\"', '"').replace("\\'", "'")
        return m.group("prefix") + '"' + content + '"' + m.group("suffix")
    return _SINGLE2DOUBLE_RE.sub(repl, s)

def _try_literal_eval(s: str):
    """
    Last-resort: parse Python-literal-ish dict/list, then convert to JSONable.
    """
    try:
        obj = ast.literal_eval(s)
        # Ensure it is JSON-serializable
        json.dumps(obj)
        return obj
    except Exception:
        return None

def _robust_json_parse(raw: str):
    """
    Progressive parsing pipeline, no network calls.
    Returns (obj, debug_steps) where debug_steps is a list of notes applied.
    """
    steps = []
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("Empty response")

    s = raw

    # 0) direct parse (fast path)
    try:
        return json.loads(s), steps
    except Exception:
        steps.append("json.loads:failed")

    # 1) strip code fences / smart quotes / BOM
    s = _strip_code_fences(s)
    if s.startswith(_BOM):
        s = s.lstrip(_BOM)
        steps.append("removed_BOM")
    s = s.translate(_SMART_QUOTES)
    # Try again
    try:
        return json.loads(s), steps + ["after_strip_fences_smartquotes"]
    except Exception:
        steps.append("json.loads_after_strip:failed")

    # 2) extract largest {...} / [...] block
    s = _extract_json_block(s)
    try:
        return json.loads(s), steps + ["after_extract_block"]
    except Exception:
        steps.append("json.loads_after_extract:failed")

    # 3) remove comments
    s = _remove_js_comments(s)
    try:
        return json.loads(s), steps + ["after_remove_comments"]
    except Exception:
        steps.append("json.loads_after_comments:failed")

    # 4) replace NaN/Infinity
    s = _replace_nan_inf(s)
    try:
        return json.loads(s), steps + ["after_replace_nan_inf"]
    except Exception:
        steps.append("json.loads_after_nan_inf:failed")

    # 5) fix trailing commas
    s = _fix_trailing_commas(s)
    try:
        return json.loads(s), steps + ["after_fix_trailing_commas"]
    except Exception:
        steps.append("json.loads_after_trailing_commas:failed")

    # 6) convert single-quoted strings/keys to double-quoted (scoped)
    s = _single_to_double_quoted_strings(s)
    try:
        return json.loads(s), steps + ["after_single_to_double"]
    except Exception:
        steps.append("json.loads_after_single_to_double:failed")

    # 7) as a final fallback, literal_eval
    obj = _try_literal_eval(s)
    if obj is not None:
        return obj, steps + ["literal_eval_fallback"]

    # Give up with a helpful snippet
    raise ValueError(f"Unable to parse JSON after cleanups. Head: {s[:240]}")


class LiftAnalysis:
    """Simple analysis class for pose estimation and video upload."""

    # Use mounted disk for temporary files to avoid ephemeral filesystem issues
    TMP_DIR = os.getenv("TMPDIR", "/var/data/tmp")
    
    LIFT_VALIDATION_AND_ANALYSIS_SCHEMA = {
        "type": "object",
        "properties": {
            "validation": {
                "type": "object",
                "properties": {
                    "valid": {
                        "type": "string",
                        "enum": ["TRUE", "FALSE", "WRONG_MOVEMENT"]
                    }
                },
                "required": ["valid"]
            },
            "analysis": {
                "type": "object",
                "properties": {
                    "accuracy": {"type": "number"},
                    "reps": {"type": "integer"},
                    "lineGraphValues": {
                        "type": "array",
                        "items": {"type": "number"}
                    },
                    "barChartValues": {
                        "type": "array",
                        "items": {"type": "number"}
                    },
                    "feedback": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "timestamp": {"type": "integer"},
                                "flaws": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                },
                                "improvement": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["timestamp", "flaws", "improvement"]
                        }
                    }
                },
                "required": ["accuracy", "reps", "lineGraphValues", "barChartValues", "feedback"]
            }
        },
        "required": ["validation", "analysis"]
    }

    def __init__(self, userId: str, lift: Dict[str, Any], liftId: str, supabase_client: Optional[httpx.AsyncClient] = None):
        from config import settings
        
        self.userId: str = userId
        self.liftId: str = liftId
        self.lift: Dict[str, Any] = lift
        self.video_uri: Optional[str] = lift.get("videoLink")
        self.video_path: Optional[str] = None
        self.video_capture: Optional[cv2.VideoCapture] = None
        self.video_is_valid: Optional[bool] = None  # Will be set by validation
        self.pose_video_url: Optional[str] = None  # Will be set after pose estimation
        self.supabase_client: Optional[httpx.AsyncClient] = supabase_client
        self.video_rotation_degrees: int = 0
        
        # Initialize Gemini AI client
        if settings.GEMINI_API_KEY:
            from google import genai
            self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            self.gemini_model_name = "gemini-2.5-flash-lite"
        else:
            self.gemini_client = None
            self.gemini_model_name = None
            
        # Log FFMPEG availability for debugging
        ffmpeg_available = self._ffmpeg_available()
        print(f"[LiftAnalysis] FFMPEG available: {ffmpeg_available}")
        if ffmpeg_available:
            print(f"[LiftAnalysis] FFMPEG in OpenCV: {'YES' in cv2.getBuildInformation()}")
        
        self.load_video_uri()
        self._ensure_temp_dir()

    def _ensure_temp_dir(self) -> None:
        """Ensure the temporary directory exists and is writable."""
        print(f"[LiftAnalysis] Ensuring temp directory exists: {self.TMP_DIR}")
        try:
            os.makedirs(self.TMP_DIR, exist_ok=True)
            print(f"[LiftAnalysis] Directory created/exists: {self.TMP_DIR}")
            
            # Test write access
            test_file = os.path.join(self.TMP_DIR, "test_write.tmp")
            with open(test_file, "w") as f:
                f.write("test")
            print(f"[LiftAnalysis] Write test successful")
            
            os.remove(test_file)
            print(f"[LiftAnalysis] Cleanup test successful")
        except Exception as e:
            print(f"[LiftAnalysis] Warning: Could not create/write to temp dir {self.TMP_DIR}: {e}")
            # Fallback to system temp if mounted disk fails
            self.TMP_DIR = tempfile.gettempdir()
            print(f"[LiftAnalysis] Fallback to system temp: {self.TMP_DIR}")

    def _file_state_str(self, f: Any) -> str:
        """Return upper-cased file state string for a Gemini File object across SDK variants."""
        try:
            state = getattr(f, "state", None)
            if isinstance(state, str):
                return state.upper()
            name_attr = getattr(state, "name", None)
            if isinstance(name_attr, str):
                return name_attr.upper()
            return (str(state) or "").upper()
        except Exception:
            return ""

    def _upload_and_wait_active(self, local_video_path: str, *, timeout_s: int = 180) -> Any:
        """Upload to Gemini Files API and block until the file becomes ACTIVE/READY.

        Returns the refreshed file object. Raises on timeout/terminal states.
        """
        
        if not local_video_path or not os.path.exists(local_video_path):
            raise FileNotFoundError(f"Video not found: {local_video_path}")

        if not self.gemini_client:
            raise RuntimeError("Gemini client not configured")

        ext = os.path.splitext(local_video_path)[1] or ".mp4"
        display_name = f"{self.liftId}-{uuid.uuid4().hex}{ext}"
        f = self.gemini_client.files.upload(file=local_video_path)

        start = time.time()
        backoff = 0.75
        while True:
            # Refresh file state
            f = self.gemini_client.files.get(name=f.name)
            state = self._file_state_str(f)

            if state in {"ACTIVE", "READY"}:
                return f
            if state in {"FAILED", "ERROR", "DELETED"}:
                raise RuntimeError(f"Gemini file entered terminal state: {state}")

            if time.time() - start > timeout_s:
                raise TimeoutError(f"Timed out waiting for Gemini file to become ACTIVE (last state={state})")

            time.sleep(backoff)
            backoff = min(backoff * 1.5, 5.0)

    def _mark_job_failed(self, error_code: str) -> None:
        """Upsert failed status for this job in the jobs table (best-effort)."""
        try:
            asset_id = self.lift.get("assetId") or self.liftId
            jobs_upsert(self.liftId, asset_id, self.userId, status="failed", progress=100, finished_at=utcnow_iso(), error=error_code, is_streak=False)
        except Exception as e:
            print(f"[LiftAnalysis] Failed to mark job failed: {e}")

    def _ffmpeg_available(self) -> bool:
        try:
            return shutil.which("ffmpeg") is not None
        except Exception:
            return False

    def _get_video_rotation_degrees(self, path: str) -> int:
        """Return rotation degrees (0/90/180/270) based on container/display matrix metadata."""
        try:
            if not self._ffmpeg_available():
                return 0
            cmd = [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=side_data_list:stream_tags=rotate",
                "-of", "json",
                path,
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            data = json.loads(res.stdout or "{}")
            streams = data.get("streams", [])
            if not streams:
                return 0
            st = streams[0]
            # Prefer explicit rotate tag
            tags = st.get("tags", {}) or {}
            if "rotate" in tags:
                try:
                    deg = int(str(tags["rotate"]).strip())
                    return deg % 360
                except Exception:
                    pass
            # Fallback to side_data_list Display Matrix rotation
            for sd in st.get("side_data_list", []) or []:
                rot = sd.get("rotation")
                if isinstance(rot, (int, float)):
                    return int(rot) % 360
            return 0
        except Exception:
            return 0

    def _build_ffmpeg_vf_with_rotation(self, base_filters: list[str], rotation_deg: int) -> str:
        """Compose an ffmpeg -vf filter string including rotation if needed."""
        filters = list(base_filters)
        if rotation_deg == 90:
            filters.append("transpose=1")  # 90 deg clockwise
        elif rotation_deg == 270:
            filters.append("transpose=2")  # 90 deg counter-clockwise
        elif rotation_deg == 180:
            # two transposes = 180deg; avoids needing rotate filter
            filters.append("transpose=1")
            filters.append("transpose=1")
        return ",".join(filters)

    def _ensure_opencv_readable(self, path: str) -> str:
        """Ensure video is readable by OpenCV, transcoding if necessary."""
        print(f"[LiftAnalysis] Ensuring OpenCV can read video: {path}")
        
        # Inspect rotation metadata up-front
        rotation_deg = self._get_video_rotation_degrees(path)
        
        # Try FFMPEG backend first with multiple attempts to get off B-frames
        cap = cv2.VideoCapture(path, cv2.CAP_FFMPEG)
        ok = False
        if cap and cap.isOpened():
            # Try a few grabs to get off a B-frame before reading
            for _ in range(5):
                cap.grab()
            ok, frame = cap.read()
        cap.release()
        
        if ok and frame is not None and frame.size > 0:
            if rotation_deg == 0:
                print(f"[LiftAnalysis] Video is already OpenCV readable")
                self.video_rotation_degrees = 0
                return path
            # If rotation exists and ffmpeg available, transcode to bake rotation
            if self._ffmpeg_available():
                print(f"[LiftAnalysis] Video readable but has rotation={rotation_deg}, will transcode to bake orientation")
            else:
                print(f"[LiftAnalysis] FFmpeg not available; will rotate frames during processing (deg={rotation_deg})")
                self.video_rotation_degrees = rotation_deg
                return path
        else:
            print(f"[LiftAnalysis] Video opened but returned empty frame, will transcode")
        
        # Transcode to H.264, yuv420p, fast preset, keep on mounted tmp
        print(f"[LiftAnalysis] Transcoding video for OpenCV compatibility...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=self.TMP_DIR) as out:
            out_path = out.name
        
        vf = self._build_ffmpeg_vf_with_rotation(["format=yuv420p", "setsar=1"], rotation_deg)
        cmd = [
            "ffmpeg", "-y", "-threads", "1", "-i", path,
            "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
            "-movflags", "+faststart", "-an",
            # Clear rotation metadata so players don't apply it again
            "-metadata:s:v:0", "rotate=0",
            "-nostats", "-loglevel", "error",
            out_path
        ]
        
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            print(f"[LiftAnalysis] Transcoding completed: {out_path}")
        except subprocess.CalledProcessError as e:
            print(f"[LiftAnalysis] Transcoding failed: {e}")
            # Clean up failed transcoded file
            try:
                os.remove(out_path)
            except:
                pass
            raise RuntimeError(f"Failed to transcode video: {e}")

        # Verify the transcoded video is readable
        cap2 = cv2.VideoCapture(out_path, cv2.CAP_FFMPEG)
        if not (cap2 and cap2.isOpened()):
            try:
                os.remove(out_path)
            except:
                pass
            raise RuntimeError("Transcoded video still not readable by OpenCV")
        ok2, frame2 = cap2.read()
        cap2.release()
        if not ok2 or frame2 is None or frame2.size == 0:
            try:
                os.remove(out_path)
            except:
                pass
            raise RuntimeError("OpenCV returned empty frame after transcode")
        
        print(f"[LiftAnalysis] Transcoding successful, video is now OpenCV readable")
        # Orientation is now baked in
        self.video_rotation_degrees = 0
        return out_path

    def _compress_video_fast(self, input_path: str) -> Optional[str]:
        """Return a fast-compressed MP4 path using ffmpeg, or None on failure.
        Prioritizes speed over size: ultrafast preset, CRF 32, no audio.
        """
        try:
            if not input_path or not os.path.exists(input_path):
                print(f"[LiftAnalysis] Compression skipped: input path invalid or missing: {input_path}")
                return None
                
            if not self._ffmpeg_available():
                print(f"[LiftAnalysis] Compression skipped: ffmpeg not available")
                return None

            original_size = os.path.getsize(input_path)
            print(f"[LiftAnalysis] Starting video compression: {input_path} (original size: {original_size:,} bytes)")

            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=self.TMP_DIR) as out_tmp:
                out_path = out_tmp.name

            cmd = [
                "ffmpeg",
                "-y",
                "-threads", "1",
                "-i",
                input_path,
                "-vcodec",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "32",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-an",
                "-nostats",  # Disable statistics output
                "-loglevel", "error",  # Only show errors
                out_path,
            ]

            print(f"[LiftAnalysis] Running ffmpeg compression command: {' '.join(cmd)}")
            # Don't capture stdout/stderr to avoid memory accumulation
            result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
            if not os.path.exists(out_path):
                print(f"[LiftAnalysis] Compression failed: output file not created")
                return None

            compressed_size = os.path.getsize(out_path)
            compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
            
            print(f"[LiftAnalysis] Compression completed: {out_path} (compressed size: {compressed_size:,} bytes, {compression_ratio:.1f}% reduction)")

            # If compression produced a larger file (unlikely), keep original
            if compressed_size >= original_size:
                print(f"[LiftAnalysis] Compression produced larger file, using original")
                os.remove(out_path)
                return None

            return out_path
        except subprocess.CalledProcessError as e:
            print(f"[LiftAnalysis] Compression failed with ffmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            return None
        except Exception as e:
            print(f"[LiftAnalysis] Compression failed with error: {e}")
            return None

    def get_fast_compressed_copy(self, input_path: str) -> str:
        """Public helper to get a fast-compressed copy if possible; otherwise returns input_path."""
        try:
            compressed = self._compress_video_fast(input_path)
            if compressed:
                print(f"[LiftAnalysis] Using compressed video: {compressed}")
                return compressed
            else:
                print(f"[LiftAnalysis] Using original video (compression failed or not beneficial): {input_path}")
                return input_path
        except Exception as e:
            print(f"[LiftAnalysis] Compression error, using original: {e}")
            return input_path

    def _download_video_from_supabase(self, supabase_video_path: str) -> Optional[str]:
        """
        Download a video from Supabase storage and return the local file path.
        Args:
            supabase_video_path: Either a full Supabase URL or path in format "bucket/path/to/video.mp4"
        Returns:
            Local file path if successful, None otherwise
        """
        try:
            log_with_context(analysis_logger, "info", f"Starting download from Supabase", user_id=self.userId, job_id=self.liftId, component="analysis", extra_fields={"video_path": supabase_video_path})
            
            # Check if this is a full Supabase URL
            if supabase_video_path.startswith('http') and 'supabase.co' in supabase_video_path:
                log_with_context(analysis_logger, "info", f"Detected full Supabase URL, using URL-based download", user_id=self.userId, job_id=self.liftId, component="analysis")
                # It's a full URL, use the existing download logic
                local_path = self._resolve_video_to_local_file(supabase_video_path)
                if local_path and os.path.exists(local_path):
                    log_with_context(analysis_logger, "info", f"URL-based download successful", user_id=self.userId, job_id=self.liftId, component="analysis", extra_fields={"local_path": local_path})
                    return local_path
                else:
                    log_with_context(analysis_logger, "warn", f"URL-based download failed, trying simple HTTP download", user_id=self.userId, job_id=self.liftId, component="analysis")
                    # Try streaming HTTP download as fallback
                    try:
                        # Create a temporary file for the video
                        suffix = os.path.splitext(supabase_video_path)[1] or ".mp4"
                        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=self.TMP_DIR) as tmp:
                            temp_path = tmp.name
                        
                        # Use streaming download to avoid loading entire file into memory
                        with httpx.stream("GET", supabase_video_path, follow_redirects=True, timeout=60.0) as resp:
                            if resp.status_code == 200:
                                with open(temp_path, 'wb') as f:
                                    for chunk in resp.iter_bytes(chunk_size=1024 * 1024):  # 1MB chunks
                                        if chunk:
                                            f.write(chunk)
                                log_with_context(analysis_logger, "info", f"Streaming HTTP download successful", user_id=self.userId, job_id=self.liftId, component="analysis", extra_fields={"local_path": temp_path})
                                return temp_path
                            else:
                                log_with_context(analysis_logger, "error", f"Streaming HTTP download failed with status: {resp.status_code}", user_id=self.userId, job_id=self.liftId, component="analysis")
                                os.remove(temp_path)
                    except Exception as e:
                        log_with_context(analysis_logger, "error", f"Streaming HTTP download failed: {e}", user_id=self.userId, job_id=self.liftId, component="analysis")
                        # Clean up temp file if it exists
                        try:
                            if 'temp_path' in locals() and os.path.exists(temp_path):
                                os.remove(temp_path)
                        except:
                            pass
                    
                    log_with_context(analysis_logger, "error", f"All download methods failed", user_id=self.userId, job_id=self.liftId, component="analysis")
                    return None
            else:
                print(f"[LiftAnalysis] Detected bucket/path format: {supabase_video_path}")
                # It's a bucket/path format
                if '/' not in supabase_video_path:
                    print(f"Invalid Supabase video path format: {supabase_video_path}")
                    return None
                
                bucket, object_path = supabase_video_path.split('/', 1)
                
                # Create a temporary file for the video
                suffix = os.path.splitext(object_path)[1] or ".mp4"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=self.TMP_DIR) as tmp:
                    temp_path = tmp.name
                
                # Try direct Supabase download first
                local_path = self._direct_supabase_download(bucket, object_path, temp_path)
                if local_path and os.path.exists(local_path):
                    return local_path
                else:
                    # If direct download fails, try URL-based approach
                    from config import settings
                    supabase_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}"
                    return self._resolve_video_to_local_file(supabase_url)
                
        except Exception as e:
            print(f"[LiftAnalysis] Error downloading video from Supabase: {e}")
            import traceback
            print(f"[LiftAnalysis] Traceback: {traceback.format_exc()}")
            return None

    def _direct_supabase_download(self, bucket: str, object_path: str, temp_path: str) -> Optional[str]:
        """
        Direct download from Supabase storage using streaming HTTP to avoid memory issues.
        This is a fallback method if the URL-based download fails.
        """
        try:
            print(f"[LiftAnalysis] Direct download: bucket={bucket}, object_path={object_path}, temp_path={temp_path}")
            
            from config import settings
            
            # Build the public URL and use streaming download instead of Supabase client
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{object_path}"
            print(f"[LiftAnalysis] Using streaming download from public URL: {public_url}")
            
            # Use streaming download to avoid loading entire file into memory
            with httpx.stream("GET", public_url, follow_redirects=True, timeout=60.0) as resp:
                if resp.status_code != 200:
                    print(f"[LiftAnalysis] Download failed with status {resp.status_code}")
                    return None
                
                # Stream chunks directly to file
                with open(temp_path, 'wb') as f:
                    for chunk in resp.iter_bytes(chunk_size=1024 * 1024):  # 1MB chunks
                        if chunk:
                            f.write(chunk)
                
                # Verify file was created and has content
                if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                    print(f"[LiftAnalysis] Successfully downloaded {os.path.getsize(temp_path)} bytes to {temp_path}")
                    return temp_path
                else:
                    print(f"[LiftAnalysis] Download completed but file is empty or missing")
                    return None
                
        except Exception as e:
            print(f"[LiftAnalysis] Error in direct Supabase download: {e}")
            import traceback
            print(f"[LiftAnalysis] Traceback: {traceback.format_exc()}")
            # Clean up the temp file if download failed
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
            return None

    def load_video_uri(self) -> None:
        if not self.video_uri:
            print(f"[LiftAnalysis] No video URI provided")
            return

        print(f"[LiftAnalysis] Loading video from URI: {self.video_uri}")
        print(f"[LiftAnalysis] Using temp directory: {self.TMP_DIR}")
        
        # Resolve remote URL to a local temporary file
        local_path = self._resolve_video_to_local_file(self.video_uri)
        if not local_path:
            print(f"[LiftAnalysis] Failed to download video from: {self.video_uri}")
            return

        print(f"[LiftAnalysis] Video downloaded to: {local_path}")
        print(f"[LiftAnalysis] File exists: {os.path.exists(local_path)}")
        if os.path.exists(local_path):
            print(f"[LiftAnalysis] File size: {os.path.getsize(local_path)} bytes")

        # Ensure video is OpenCV readable (transcode if necessary)
        try:
            local_path = self._ensure_opencv_readable(local_path)
        except Exception as e:
            print(f"[LiftAnalysis] Failed to make video OpenCV readable: {e}")
            try:
                os.remove(local_path)
            except Exception:
                pass
            self.video_path = None
            self.video_capture = None
            return

        self.video_path = local_path
        
        # Force software decode for consistent behavior across different systems
        # This ensures deterministic frame timing and eliminates hardware decoder variance
        cap = cv2.VideoCapture(local_path, cv2.CAP_FFMPEG)
        if not cap or not cap.isOpened():
            print(f"[LiftAnalysis] Failed to open video with OpenCV: {local_path}")
            try:
                os.remove(local_path)
            except Exception:
                pass
            self.video_path = None
            self.video_capture = None
            return
        
        # Deterministic warm-up sequence to settle decoder state
        # This avoids landing on pre-decoded B-frames and ensures consistent starting point
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        for _ in range(12):  # ~0.5s at ~24 FPS; adjust as desired
            ok = cap.grab()
            if not ok:
                break
        
        print(f"[LiftAnalysis] Video opened with software decode")
        
        self.video_capture = cap

    @staticmethod
    def _extract_bucket_and_path(url: str) -> Optional[tuple[str, str]]:
        try:
            parsed = urlparse(url)
            if not parsed.netloc or "/storage/v1/object" not in parsed.path:
                return None
            # Take substring after '/storage/v1/object/'
            base = "/storage/v1/object/"
            idx = parsed.path.find(base)
            remainder = parsed.path[idx + len(base):]
            # Strip optional 'public/' prefix
            if remainder.startswith("public/"):
                remainder = remainder[len("public/"):]
            # Split by '/' to get bucket and object path
            # For URL: /storage/v1/object/public/lifts/7607ee81-38c8-4667-a8e4-e8b9c69376d0/videos/1756583611575.mov
            # remainder after 'public/' will be: lifts/7607ee81-38c8-4667-a8e4-e8b9c69376d0/videos/1756583611575.mov
            # First segment is bucket: lifts
            # Rest is object path: 7607ee81-38c8-4667-a8e4-e8b9c69376d0/videos/1756583611575.mov
            parts = remainder.split("/", 1)
            if len(parts) != 2:
                return None
            bucket, object_path = parts[0], parts[1]
            return bucket, object_path
        except Exception:
            return None

    @staticmethod
    def _resolve_video_to_local_file(url: str) -> Optional[str]:
        """
        Download video to a temporary file and return its path using streaming.
        Uses authenticated Supabase client first (faster), then falls back to HTTP streaming.
        """
        print(f"[LiftAnalysis] Starting video download from: {url}")
        print(f"[LiftAnalysis] Using temp directory: {LiftAnalysis.TMP_DIR}")
        
        # Try authenticated Supabase client download first (usually works)
        print(f"[LiftAnalysis] Trying Supabase client download...")
        try:
            from supabase import create_client, Client
            from config import settings
            
            supabase: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            
            # Extract bucket and path from URL
            bucket_and_path = LiftAnalysis._extract_bucket_and_path(url)
            if bucket_and_path:
                bucket, path = bucket_and_path
                print(f"[LiftAnalysis] Supabase client download: bucket={bucket}, path={path}")
                
                # Create temp file
                ext = os.path.splitext(path)[1] or ".mov"
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=LiftAnalysis.TMP_DIR) as tmp:
                    temp_path = tmp.name
                
                # Download with authenticated client
                data = supabase.storage.from_(bucket).download(path)
                if isinstance(data, (bytes, bytearray)) and len(data) > 0:
                    with open(temp_path, 'wb') as f:
                        f.write(data)
                    print(f"[LiftAnalysis] Supabase client download successful: {temp_path} ({len(data)} bytes)")
                    return temp_path
                else:
                    print(f"[LiftAnalysis] Supabase client download failed: empty response")
                    os.remove(temp_path)
            else:
                print(f"[LiftAnalysis] Could not extract bucket/path from URL for Supabase client")
        except Exception as e:
            print(f"[LiftAnalysis] Supabase client download failed: {e}")
        
        # Fallback to HTTP streaming (usually fails with 400 for private files)
        print(f"[LiftAnalysis] Trying HTTP streaming download as fallback...")
        max_attempts = 3
        delay_seconds = 1.0
        
        for attempt in range(1, max_attempts + 1):
            try:
                print(f"[LiftAnalysis] HTTP download attempt {attempt}/{max_attempts}")
                # Create temp file first
                ext = os.path.splitext(urlparse(url).path)[1] or ".mov"
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=LiftAnalysis.TMP_DIR) as tmp:
                    temp_path = tmp.name
                
                print(f"[LiftAnalysis] Created temp file: {temp_path}")
                
                # Stream download directly to file
                with httpx.stream("GET", url, follow_redirects=True, timeout=60.0) as resp:
                    print(f"[LiftAnalysis] HTTP response status: {resp.status_code}")
                    if resp.status_code != 200:
                        print(f"[LiftAnalysis] HTTP download status {resp.status_code} on attempt {attempt}/{max_attempts}")
                        os.remove(temp_path)
                        continue
                    
                    # Stream chunks directly to file
                    with open(temp_path, "wb") as f:
                        for chunk in resp.iter_bytes(chunk_size=1024 * 1024):  # 1MB chunks
                            if chunk:
                                f.write(chunk)
                    
                    # Verify file was created and has content
                    if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                        print(f"[LiftAnalysis] HTTP download successful: {temp_path} ({os.path.getsize(temp_path)} bytes)")
                        return temp_path
                    else:
                        print(f"[LiftAnalysis] HTTP download failed: file empty or missing")
                        os.remove(temp_path)
                        
            except Exception as e:
                print(f"[LiftAnalysis] HTTP download attempt {attempt}/{max_attempts} failed: {e}")
                # Clean up temp file if it exists
                try:
                    if 'temp_path' in locals() and os.path.exists(temp_path):
                        os.remove(temp_path)
                except:
                    pass
                    
            if attempt < max_attempts:
                import time
                time.sleep(delay_seconds)
                delay_seconds *= 2
        
        print(f"[LiftAnalysis] All download attempts failed for: {url}")
        return None

    @staticmethod
    def _calculate_angle(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
        """Return the angle ABC (in degrees) with B as the vertex."""
        a_arr = np.array(a, dtype=float)
        b_arr = np.array(b, dtype=float)
        c_arr = np.array(c, dtype=float)
        ba = a_arr - b_arr
        bc = c_arr - b_arr
        radians = np.arctan2(bc[1], bc[0]) - np.arctan2(ba[1], ba[0])
        angle = np.abs(radians * 180.0 / np.pi)
        if angle > 180.0:
            angle = 360.0 - angle
        return float(angle)

    @staticmethod
    def _to_pixel(point_norm: tuple[float, float], frame_width: int, frame_height: int) -> tuple[int, int]:
        x = int(point_norm[0] * frame_width)
        y = int(point_norm[1] * frame_height)
        return x, y

    @staticmethod
    def _callout_position(
        center_norm: tuple[float, float],
        point_norm: tuple[float, float],
        frame_width: int,
        frame_height: int,
        offset_px: int = 60,
    ) -> tuple[int, int]:
        """Compute a callout anchor pixel position offset away from body center toward the point."""
        vx = float(point_norm[0] - center_norm[0])
        vy = float(point_norm[1] - center_norm[1])
        mag = float(np.hypot(vx, vy))
        if mag < 1e-6:
            vx, vy = 1.0, 0.0
        else:
            vx /= mag
            vy /= mag
        # Convert pixel offset to normalized units
        nx = point_norm[0] + vx * (offset_px / float(frame_width))
        ny = point_norm[1] + vy * (offset_px / float(frame_height))
        # Clamp to frame bounds
        nx = min(max(nx, 0.0), 1.0)
        ny = min(max(ny, 0.0), 1.0)
        return LiftAnalysis._to_pixel((nx, ny), frame_width, frame_height)

    def add_pose_skeleton(self, *, target_height: int = 480, frame_skip: int = 2) -> Dict[str, Any]:
        """Overlay MediaPipe Pose skeleton on the loaded video and export a new video."""
        if not self.video_capture:
            self.load_video_uri()
        if not self.video_capture or not self.video_capture.isOpened():
            self._mark_job_failed("POSE_ESTIMATION_FAILED")
            return {
                "success": False,
                "error": "Video not available or could not be opened",
            }

        # Prepare output writer with downscaling
        original_frame_width = int(self.video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        original_frame_height = int(self.video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = self.video_capture.get(cv2.CAP_PROP_FPS) or 30.0
        rotation_deg = getattr(self, "video_rotation_degrees", 0) or 0

        # Effective dimensions after applying rotation (if any)
        effective_input_width = original_frame_height if rotation_deg in (90, 270) else original_frame_width
        effective_input_height = original_frame_width if rotation_deg in (90, 270) else original_frame_height

        # Compute output size (downscale if needed)
        if effective_input_height > target_height:
            scale = target_height / max(1, effective_input_height)
            frame_width, frame_height = int(effective_input_width * scale), target_height
        else:
            frame_width, frame_height = effective_input_width, effective_input_height

        # Normalize UI constants to scale factor for consistent visuals across resolutions
        baseline_h = 480  # design baseline height
        scale_factor = max(0.5, min(2.0, frame_height / baseline_h))  # clamp to reasonable range
        
        # Scale all UI constants for consistent appearance across different resolutions
        # Landmark circle sizes — center +1px, adjust other rings to maintain proportions
        r_inner = max(1, int(2 * scale_factor) + 1)                 # small inner black (center) +1px
        r_white = max(r_inner + 1, int(3 * scale_factor) + 1)       # keep ~1px white ring beyond the new center
        r_outer = max(r_white + 2, int(5 * scale_factor) + 1)       # thin outer black ring maintained
        # Old baselines scaled for consistency - restore previous container feel
        # Slightly reduce horizontal offset so boxes sit nearer to joints
        LATERAL_OFFSET_PX = int(84 * scale_factor)
        VERTICAL_OFFSET_PX = int(10 * scale_factor)  # old feel (was 4)
        BOX_RADIUS = int(6 * scale_factor)
        EDGE_PAD = int(8 * scale_factor)
        # Smaller horizontal nudge during collision resolution to avoid drifting too far
        STEP_X = int(12 * scale_factor)
        STEP_Y = int(10 * scale_factor)
        MARGIN = int(6 * scale_factor)
        # Slightly slimmer container (only a few px)
        MIN_W, MIN_H = int(36 * scale_factor), int(22 * scale_factor)
        # Degree ring + spacing (smaller)
        donut_r = int(2 * scale_factor)
        # Make degree circle slightly thicker
        donut_thk = 2
        gap_between = int(4 * scale_factor)
        pad = int(6 * scale_factor)            # slightly less padding
        thickness = max(1, int(2 * scale_factor))
        
        # Make containers slightly less wide (by a few px)
        FIXED_BOX_W = int(40 * scale_factor)
        FIXED_BOX_H = int(24 * scale_factor)   # new: short, tidy height

        # Use MP4V for better compatibility, will compress later with ffmpeg
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=self.TMP_DIR) as out_tmp:
            output_path = out_tmp.name

        # Stabilize FPS handling for consistent frame sampling
        TARGET_FPS = 30.0
        input_fps = fps or 30.0
        
        # Choose frame skip to get close to target FPS
        frame_skip = max(1, int(round(input_fps / TARGET_FPS)))
        output_fps = input_fps / frame_skip
        writer = cv2.VideoWriter(output_path, fourcc, output_fps, (frame_width, frame_height))
        if not writer.isOpened():
            self._mark_job_failed("POSE_ESTIMATION_FAILED")
            return {
                "success": False,
                "error": "Failed to initialize video writer",
            }

        # Initialize MediaPipe Pose
        mp_pose = mp.solutions.pose
        mp_drawing = mp.solutions.drawing_utils
        mp_styles = mp.solutions.drawing_styles

        # Use a fixed scale factor for consistent skeleton and container sizing
        # regardless of video resolution (hdVideos true/false should look the same)
        scale_factor = 1.0

        frames_processed = 0

        # Helper to draw a filled rounded rectangle with a border (supports both BGR and RGBA)
        def draw_rounded_rect(img, x1, y1, x2, y2, radius, fill_color, border_color, border_thickness):
            x1 = int(x1)
            y1 = int(y1)
            x2 = int(x2)
            y2 = int(y2)
            radius = int(max(0, min(radius, (x2 - x1) // 2, (y2 - y1) // 2)))

            # Handle both BGR and RGBA colors
            if len(fill_color) == 4:  # RGBA
                fill_bgr = fill_color[:3]
            else:  # BGR
                fill_bgr = fill_color
                
            if len(border_color) == 4:  # RGBA
                border_bgr = border_color[:3]
            else:  # BGR
                border_bgr = border_color

            # Fill center and sides
            cv2.rectangle(img, (x1 + radius, y1), (x2 - radius, y2), fill_bgr, cv2.FILLED)
            cv2.rectangle(img, (x1, y1 + radius), (x2, y2 - radius), fill_bgr, cv2.FILLED)

            # Fill corners
            cv2.circle(img, (x1 + radius, y1 + radius), radius, fill_bgr, cv2.FILLED)
            cv2.circle(img, (x2 - radius, y1 + radius), radius, fill_bgr, cv2.FILLED)
            cv2.circle(img, (x1 + radius, y2 - radius), radius, fill_bgr, cv2.FILLED)
            cv2.circle(img, (x2 - radius, y2 - radius), radius, fill_bgr, cv2.FILLED)

            if border_thickness > 0:
                # Straight edges
                cv2.line(img, (x1 + radius, y1), (x2 - radius, y1), border_bgr, border_thickness)
                cv2.line(img, (x1 + radius, y2), (x2 - radius, y2), border_bgr, border_thickness)
                cv2.line(img, (x1, y1 + radius), (x1, y2 - radius), border_bgr, border_thickness)
                cv2.line(img, (x2, y1 + radius), (x2, y2 - radius), border_bgr, border_thickness)

                # Corner arcs
                cv2.ellipse(img, (x1 + radius, y1 + radius), (radius, radius), 0, 180, 270, border_bgr, border_thickness)
                cv2.ellipse(img, (x2 - radius, y1 + radius), (radius, radius), 0, 270, 360, border_bgr, border_thickness)
                cv2.ellipse(img, (x1 + radius, y2 - radius), (radius, radius), 0, 90, 180, border_bgr, border_thickness)
                cv2.ellipse(img, (x2 - radius, y2 - radius), (radius, radius), 0, 0, 90, border_bgr, border_thickness)

        # Precompute filtered connections and drawing specs to avoid rebuilding every frame
        L = mp_pose.PoseLandmark
        
        head_indices = {
            L.NOSE.value, L.LEFT_EYE_INNER.value, L.LEFT_EYE.value, L.LEFT_EYE_OUTER.value,
            L.RIGHT_EYE_INNER.value, L.RIGHT_EYE.value, L.RIGHT_EYE_OUTER.value,
            L.LEFT_EAR.value, L.RIGHT_EAR.value, L.MOUTH_LEFT.value, L.MOUTH_RIGHT.value,
        }

        # Hide finger tips; keep only wrists for hands
        hand_tip_indices = {
            L.LEFT_THUMB.value, L.LEFT_INDEX.value, L.LEFT_PINKY.value,
            L.RIGHT_THUMB.value, L.RIGHT_INDEX.value, L.RIGHT_PINKY.value,
        }

        # Feet tips: hide heel & big toe; keep ankles visible
        foot_tip_indices = {
            L.LEFT_HEEL.value, L.RIGHT_HEEL.value,
            L.LEFT_FOOT_INDEX.value, L.RIGHT_FOOT_INDEX.value,
        }

        # Keep connections, but drop any that touch head, finger tips, or foot tips
        filtered_connections = [
            (a_idx, b_idx) for a_idx, b_idx in mp_pose.POSE_CONNECTIONS
            if a_idx not in (head_indices | hand_tip_indices | foot_tip_indices)
            and b_idx not in (head_indices | hand_tip_indices | foot_tip_indices)
        ]
        
        # Persistent per-joint placement state (index -> dict)
        joint_state = {}  # { idx: {"ux": float, "uy": float, "side": 'L'|'R'} }
        EMA_ALPHA = 0.2
        SIDE_DEAD = 0.02  # ~2% of frame width in normalized coords (faster side flips)
        
        # Always-visible landmarks (small) - scaled for consistency
        landmark_spec = mp_drawing.DrawingSpec(
            color=(10, 10, 10), 
            thickness=max(1, int(2 * scale_factor)), 
            circle_radius=max(1, int(2 * scale_factor))
        )
        # keep your skeleton color
        skeleton_color = (240, 232, 226)
        filtered_connection_spec = mp_drawing.DrawingSpec(
            color=skeleton_color, thickness=max(3, int(3 * scale_factor)), circle_radius=max(2, int(3 * scale_factor))
        )
        
        # Overlay cadence - reduced frequency for better CPU performance
        # Rebuild overlays every frame for zero-lag callouts
        SHOW_CALLOUTS_EVERY = 1
        written_idx = 0           # counts frames that are actually written
        
        # Pre-initialize overlay arrays to avoid UnboundLocalError
        overlay_lines_bgr = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
        overlay_lines_mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
        overlay_boxes_bgr = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
        overlay_boxes_mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
        
        # Visibility gating + hysteresis to avoid flicker
        VIS_ALPHA = 0.5           # EMA smoothing for landmark visibility (more responsive)
        VIS_ON = 0.45             # show when smoothed vis goes above this
        VIS_OFF = 0.30            # hide when smoothed vis drops below this
        IN_FRAME_MARGIN = 0.005   # require landmark to be well within frame (relaxed from 0.02)
        MIN_SEG_LEN_PX = max(4, int(min(frame_width, frame_height) * 0.008))  # dynamic based on frame size
        
        # Track smoothed visibility & shown state per landmark index
        lm_vis_state = {}  # { idx: {"ema": float, "shown": bool} }
        
        # Sticky callout state: remember last known good angle & position per tag
        callout_state = {}  # { "L_EL": {"angle": float, "x": float, "y": float, "fresh": bool} }
        ANGLE_EMA = 0.5     # smoothing for angle (more responsive)
        POS_EMA   = 0.6     # smoothing for position (more responsive)
        
        # Performance monitoring (simplified)
        
        # No coarse snapping; clamp only for smoother following
        def _clamp_int(v, lo, hi): 
            return max(lo, min(hi, int(v)))

        def _clamp01(v): 
            return 0.0 if v < 0.0 else 1.0 if v > 1.0 else v

        def _inside_soft(pt):
            # allow slightly out-of-bounds from MP, then clamp later
            x, y = float(pt.x), float(pt.y)
            return (-0.05 <= x <= 1.05) and (-0.05 <= y <= 1.05)

        def _try_angle(a_idx, b_idx, c_idx, lm, w, h):
            # Best-effort angle: if points exist and not completely degenerate, compute
            a, b, c = lm[a_idx], lm[b_idx], lm[c_idx]
            if not (_inside_soft(a) and _inside_soft(b) and _inside_soft(c)):
                return None
            # reject obviously degenerate geometry
            if _seg_len_px(a, b, w, h) < 3 or _seg_len_px(b, c, w, h) < 3:
                return None
            ang = self._calculate_angle((a.x, a.y), (b.x, b.y), (c.x, c.y))
            bx = _clamp01(b.x); by = _clamp01(b.y)
            return (ang, (bx, by))

        def _is_in_frame(pt):
            x, y = float(pt.x), float(pt.y)
            margin = IN_FRAME_MARGIN
            return (-0.02 <= x <= 1.0 + 0.02) and (-0.02 <= y <= 1.0 + 0.02) and \
                   (margin <= x <= 1.0 - margin) and (margin <= y <= 1.0 - margin)

        def _update_vis(idx, lm):
            raw = float(getattr(lm, "visibility", 0.0))
            st = lm_vis_state.get(idx, {"ema": raw, "shown": False})
            st["ema"] = (1 - VIS_ALPHA) * st["ema"] + VIS_ALPHA * raw
            # hysteresis
            if st["shown"]:
                st["shown"] = st["ema"] > VIS_OFF
            else:
                st["shown"] = st["ema"] > VIS_ON
            lm_vis_state[idx] = st
            return st["shown"]

        def _ok_landmark(idx, lm):
            """Visible enough, confidently present, and inside frame."""
            l = lm[idx]
            vis_ok = _update_vis(idx, l)
            presence = getattr(l, "presence", 1.0)
            try:
                presence = float(presence)
            except Exception:
                presence = 1.0
            presence_ok = presence > 0.3  # relaxed from 0.5
            return vis_ok and presence_ok and _is_in_frame(l)

        def _px(p, w, h):
            return int(p.x * w), int(p.y * h)

        def _seg_len_px(a, b, w, h):
            ax, ay = _px(a, w, h); bx, by = _px(b, w, h)
            return ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5

        def _angle_if_visible(a_idx, b_idx, c_idx, tag, lm, w, h):
            """Return (angle, point_norm, tag) only if vertex is clearly visible and geometry is sane."""
            # Require the vertex to be clearly visible (visibility + presence + in-frame)
            if not _ok_landmark(b_idx, lm):
                return None

            a, b, c = lm[a_idx], lm[b_idx], lm[c_idx]

            # For the side points, only require "in frame" (not full visibility),
            # because occlusion happens often while the center joint is still trustworthy.
            if not (_is_in_frame(a) and _is_in_frame(c)):
                return None

            # Ensure segments are not degenerate
            if _seg_len_px(a, b, w, h) < MIN_SEG_LEN_PX or _seg_len_px(b, c, w, h) < MIN_SEG_LEN_PX:
                return None

            ang = self._calculate_angle((a.x, a.y), (b.x, b.y), (c.x, c.y))
            return (ang, (b.x, b.y), tag)

        try:
            # Use most efficient MediaPipe settings for CPU performance
            with mp_pose.Pose(
                static_image_mode=False, 
                model_complexity=0,  # Lightest model
                enable_segmentation=False, 
                min_detection_confidence=0.5, 
                min_tracking_confidence=0.5,
                smooth_landmarks=True  # Enable smoothing for better performance
            ) as pose:
                frame_idx = 0
                while True:
                    # Performance monitoring - start timing
                    frame_start_time = time.time()
                    
                    # Skip frames cheaply to reduce CPU
                    for _ in range(max(0, frame_skip - 1)):
                        if not self.video_capture.grab():
                            ret = False
                            break
                    ret, frame_bgr = self.video_capture.read()
                    if not ret:
                        break
                    
                    # Apply rotation if needed (only occurs when rotation couldn't be baked during transcode)
                    if rotation_deg:
                        if rotation_deg == 90:
                            frame_bgr = cv2.rotate(frame_bgr, cv2.ROTATE_90_CLOCKWISE)
                        elif rotation_deg == 180:
                            frame_bgr = cv2.rotate(frame_bgr, cv2.ROTATE_180)
                        elif rotation_deg == 270:
                            frame_bgr = cv2.rotate(frame_bgr, cv2.ROTATE_90_COUNTERCLOCKWISE)

                    # Resize to target output dimensions if different
                    if (frame_bgr.shape[1], frame_bgr.shape[0]) != (frame_width, frame_height):
                        frame_bgr = cv2.resize(frame_bgr, (frame_width, frame_height), interpolation=cv2.INTER_AREA)

                    # Pose every written frame (fast model)
                    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                    frame_rgb.flags.writeable = False
                    results = pose.process(frame_rgb)
                    frame_rgb.flags.writeable = True

                    # Draw skeleton + small joints EVERY frame (stable)
                    if results.pose_landmarks is not None:
                        # Draw skeleton connections first (already filtered)
                        mp_drawing.draw_landmarks(
                            image=frame_bgr,
                            landmark_list=results.pose_landmarks,
                            connections=filtered_connections,
                            landmark_drawing_spec=None,  # disable auto-drawing of all landmarks
                            connection_drawing_spec=filtered_connection_spec,
                        )
                        
                        # Collect joint centers to draw AFTER leader lines
                        landmark_centers = []
                        for idx, lm in enumerate(results.pose_landmarks.landmark):
                            if idx not in (head_indices | hand_tip_indices | foot_tip_indices):
                                h, w, _ = frame_bgr.shape
                                cx, cy = int(lm.x * w), int(lm.y * h)
                                landmark_centers.append((cx, cy))

                    # Rebuild callout overlay only on cadence
                    if results.pose_landmarks is not None and (written_idx % SHOW_CALLOUTS_EVERY) == 0:
                        # Two layers: lines below, boxes above
                        overlay_lines_bgr = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
                        overlay_lines_mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
                        overlay_boxes_bgr = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
                        overlay_boxes_mask = np.zeros((frame_height, frame_width), dtype=np.uint8)

                        lm = results.pose_landmarks.landmark
                        fw, fh = frame_width, frame_height

                        def xy(idx: int) -> tuple[float, float]:
                            p = lm[idx]
                            return float(p.x), float(p.y)

                        l_sh = xy(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
                        r_sh = xy(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
                        l_hp = xy(mp_pose.PoseLandmark.LEFT_HIP.value)
                        r_hp = xy(mp_pose.PoseLandmark.RIGHT_HIP.value)

                        sh_mid = ((l_sh[0] + r_sh[0]) / 2.0, (l_sh[1] + r_sh[1]) / 2.0)
                        hp_mid = ((l_hp[0] + r_hp[0]) / 2.0, (l_hp[1] + r_hp[1]) / 2.0)
                        torso_center = ((sh_mid[0] + hp_mid[0]) / 2.0, (sh_mid[1] + hp_mid[1]) / 2.0)

                        # Always-visible angle calculation with sticky state
                        L = mp_pose.PoseLandmark
                        candidates = [
                            (L.LEFT_SHOULDER.value,  L.LEFT_ELBOW.value,  L.LEFT_WRIST.value,  "L_EL"),
                            (L.RIGHT_SHOULDER.value, L.RIGHT_ELBOW.value, L.RIGHT_WRIST.value, "R_EL"),
                            (L.LEFT_HIP.value,       L.LEFT_KNEE.value,   L.LEFT_ANKLE.value,  "L_KN"),
                            (L.RIGHT_HIP.value,      L.RIGHT_KNEE.value,  L.RIGHT_ANKLE.value, "R_KN"),
                            (L.LEFT_ELBOW.value,     L.LEFT_SHOULDER.value,  L.LEFT_HIP.value, "L_SH"),
                            (L.RIGHT_ELBOW.value,    L.RIGHT_SHOULDER.value, L.RIGHT_HIP.value,"R_SH"),
                            (L.LEFT_SHOULDER.value,  L.LEFT_HIP.value,   L.LEFT_KNEE.value,    "L_HP"),
                            (L.RIGHT_SHOULDER.value, L.RIGHT_HIP.value,  L.RIGHT_KNEE.value,   "R_HP"),
                        ]

                        angle_points = []
                        fw, fh = frame_width, frame_height

                        for a_idx, b_idx, c_idx, tag in candidates:
                            fresh = False
                            if results.pose_landmarks is not None:
                                got = _try_angle(a_idx, b_idx, c_idx, results.pose_landmarks.landmark, fw, fh)
                            else:
                                got = None

                            if got is not None:
                                fresh = True
                                ang_now, (bx, by) = got
                                st = callout_state.get(tag, {"angle": ang_now, "x": bx, "y": by, "fresh": True})

                                # EMA smoothing for nicer motion (angle wrap safe enough for [0..180])
                                st["angle"] = (1 - ANGLE_EMA) * float(st["angle"]) + ANGLE_EMA * float(ang_now)
                                st["x"]     = (1 - POS_EMA)   * float(st["x"])     + POS_EMA   * float(bx)
                                st["y"]     = (1 - POS_EMA)   * float(st["y"])     + POS_EMA   * float(by)
                                st["fresh"] = True
                                callout_state[tag] = st
                            else:
                                # No current angle → use last known state, or seed safely near torso center
                                st = callout_state.get(tag)
                                if st is None:
                                    # seed at torso center with a neutral angle (e.g., 90°)
                                    seed_x, seed_y = torso_center
                                    st = {"angle": 90.0, "x": _clamp01(seed_x), "y": _clamp01(seed_y), "fresh": False}
                                    callout_state[tag] = st
                                else:
                                    st["fresh"] = False

                            # Always push a point for drawing (fresh or stale)
                            angle_points.append( (float(callout_state[tag]["angle"]),
                                                  (float(callout_state[tag]["x"]), float(callout_state[tag]["y"])),
                                                  tag,
                                                  bool(callout_state[tag]["fresh"])) )

                        # Always rebuild overlay since we always have angle_points
                        overlay_bgr = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
                        overlay_mask = np.zeros((frame_height, frame_width), dtype=np.uint8)

                        # draw rounded boxes with hysteresis placement on overlay
                        box_alpha = 255                    # 100% opacity

                        # keep track of already placed rects this frame
                        placed_rects = []   # each item: (x1,y1,x2,y2, side)
                        
                        # Edge- & collision-safe placement functions
                        def _rect_intersects(a, b):
                            ax1, ay1, ax2, ay2 = a
                            bx1, by1, bx2, by2 = b
                            return not (ax2 + MARGIN < bx1 or bx2 + MARGIN < ax1 or ay2 + MARGIN < by1 or by2 + MARGIN < ay1)

                        def _shift_inside_frame(r):
                            """Shift rect inside the frame without shrinking it."""
                            rx1, ry1, rx2, ry2 = r
                            w = rx2 - rx1
                            h = ry2 - ry1
                            # horizontal
                            if rx1 < EDGE_PAD:
                                dx = EDGE_PAD - rx1
                                rx1 += dx; rx2 += dx
                            if rx2 > fw - 1 - EDGE_PAD:
                                dx = (fw - 1 - EDGE_PAD) - rx2
                                rx1 += dx; rx2 += dx
                            # vertical
                            if ry1 < EDGE_PAD:
                                dy = EDGE_PAD - ry1
                                ry1 += dy; ry2 += dy
                            if ry2 > fh - 1 - EDGE_PAD:
                                dy = (fh - 1 - EDGE_PAD) - ry2
                                ry1 += dy; ry2 += dy
                            # clamp as last resort
                            rx1 = _clamp_int(rx1, 0, max(0, fw - 1))
                            rx2 = _clamp_int(rx2, 0, max(0, fw - 1))
                            ry1 = _clamp_int(ry1, 0, max(0, fh - 1))
                            ry2 = _clamp_int(ry2, 0, max(0, fh - 1))
                            # keep width/height if possible
                            if rx2 - rx1 < w:
                                # try to recenter horizontally
                                cx = (rx1 + rx2) // 2
                                rx1 = _clamp_int(cx - w // 2, 0, fw - 1)
                                rx2 = _clamp_int(rx1 + w, 0, fw - 1)
                            if ry2 - ry1 < h:
                                cy = (ry1 + ry2) // 2
                                ry1 = _clamp_int(cy - h // 2, 0, fh - 1)
                                ry2 = _clamp_int(ry1 + h, 0, fh - 1)
                            return [rx1, ry1, rx2, ry2]

                        def _overflow_amount(r):
                            """How much this rect sticks out; used to decide if a flip helps."""
                            rx1, ry1, rx2, ry2 = r
                            over = 0
                            if rx1 < EDGE_PAD: over += EDGE_PAD - rx1
                            if rx2 > fw - 1 - EDGE_PAD: over += rx2 - (fw - 1 - EDGE_PAD)
                            if ry1 < EDGE_PAD: over += EDGE_PAD - ry1
                            if ry2 > fh - 1 - EDGE_PAD: over += ry2 - (fh - 1 - EDGE_PAD)
                            return over

                        for ang, point, key, fresh in angle_points:
                            # pick colors: bright when fresh, dim when stale
                            border_color_bgr = (20, 20, 20) if fresh else (70, 70, 70)
                            fill_color_bgr   = (106, 184, 255) if fresh else (120, 160, 200)
                            
                            px, py = self._to_pixel(point, fw, fh)

                            vx = float(point[0] - torso_center[0])
                            vy = float(point[1] - torso_center[1])

                            st = joint_state.get(key, {"ux": 1.0, "uy": 0.0, "side": None})
                            # EMA smoothing of direction
                            st["ux"] = (1 - EMA_ALPHA) * st["ux"] + EMA_ALPHA * vx
                            st["uy"] = (1 - EMA_ALPHA) * st["uy"] + EMA_ALPHA * vy

                            # Decide side with hysteresis in normalized space
                            if st["side"] is None:
                                st["side"] = 'R' if st["ux"] >= 0 else 'L'
                            else:
                                if st["side"] == 'R' and st["ux"] < -SIDE_DEAD:
                                    st["side"] = 'L'
                                elif st["side"] == 'L' and st["ux"] > SIDE_DEAD:
                                    st["side"] = 'R'

                            joint_state[key] = st

                            # ==== Dynamic container sizing from text metrics ====
                            font = cv2.FONT_HERSHEY_SIMPLEX
                            text = f"{int(round(ang))}"
                            # Make angle text ~0.5–1px bigger (via small scale bump)
                            FONT_SCALE_BASE = 0.57
                            scale = FONT_SCALE_BASE * scale_factor
                            thickness = 2
                            (tw, th), baseline = cv2.getTextSize(text, font, scale, thickness)

                            # Decorations - donut_r, donut_thk, gap_between, pad are already defined above with scale_factor

                            # Compute needed content height (in case we ever overflow)
                            deg_diam  = donut_r * 2 + donut_thk
                            content_h = max(th, deg_diam)
                            SAFETY = int(3 * scale_factor)

                            # Fixed compact size, but allow to grow if absolutely necessary
                            box_w = max(FIXED_BOX_W, MIN_W)
                            preferred_h = max(FIXED_BOX_H, MIN_H)
                            box_h = max(preferred_h, content_h + 2 * pad + SAFETY)

                            # --- LATERAL-FIRST PLACEMENT (tighter + clean edge join) ---
                            # LATERAL_OFFSET_PX, VERTICAL_OFFSET_PX, BOX_RADIUS are already defined above with scale_factor

                            # side-aware horizontal offset (pure lateral)
                            sgn = 1 if st["side"] == 'R' else -1

                            # Reduce lateral offset if the fixed-width box would clip the screen edge
                            if st["side"] == 'R':
                                max_offset_that_fits = max(0, (fw - EDGE_PAD - box_w) - px)
                                eff_offset = int(min(LATERAL_OFFSET_PX, max_offset_that_fits))
                                anchor_x = int(px + eff_offset)
                            else:
                                max_offset_that_fits = max(0, px - EDGE_PAD - box_w)
                                eff_offset = int(min(LATERAL_OFFSET_PX, max_offset_that_fits))
                                anchor_x = int(px - eff_offset)

                            # tiny vertical bias from motion
                            vertical_bias = float(np.clip(st["uy"], -1.0, 1.0)) * VERTICAL_OFFSET_PX
                            anchor_y = int(py + vertical_bias)

                            # Box spans to the chosen side; vertically center on anchor
                            if st["side"] == 'R':
                                x1, x2 = anchor_x, anchor_x + int(box_w)   # box to the RIGHT of the joint
                            else:
                                x1, x2 = anchor_x - int(box_w), anchor_x   # box to the LEFT of the joint

                            y1 = int(anchor_y - box_h / 2)
                            y2 = int(anchor_y + box_h / 2)

                            # Clamp to frame
                            x1 = _clamp_int(x1, 0, fw - 1)
                            x2 = _clamp_int(x2, 0, fw - 1)
                            y1 = _clamp_int(y1, 0, fh - 1)
                            y2 = _clamp_int(y2, 0, fh - 1)

                            # ---- Edge- & collision-safe placement for angle boxes ----
                            # Tunables - BOX_RADIUS, EDGE_PAD, STEP_X, STEP_Y, MARGIN are already defined above with scale_factor
                            MAX_ITERS  = 14         # safety cap

                            # desired rect from current side/anchor
                            rect = [x1, y1, x2, y2]
                            side = st["side"]
                            sgn = 1 if side == 'R' else -1

                            # Only consider a one-time flip if we overflow the frame on the current side
                            start_over = _overflow_amount(rect)
                            if start_over > 0:
                                if side == 'R':
                                    maybe = [anchor_x - int(box_w), y1, anchor_x, y2]  # flip to L
                                    maybe_over = _overflow_amount(maybe)
                                    if maybe_over + 2 * STEP_X < start_over:
                                        side = 'L'; sgn = -1; rect = maybe
                                else:
                                    maybe = [anchor_x, y1, anchor_x + int(box_w), y2]  # flip to R
                                    maybe_over = _overflow_amount(maybe)
                                    if maybe_over + 2 * STEP_X < start_over:
                                        side = 'R'; sgn = 1; rect = maybe

                            # Shift fully inside the frame without shrinking width/height
                            rect = _shift_inside_frame(rect)

                            # Resolve collisions while preserving full size
                            iters = 0; k = 0; MAX_ITERS = 14
                            while iters < MAX_ITERS and any(_rect_intersects(rect, (px1, py1, px2, py2)) for (px1, py1, px2, py2, _) in placed_rects):
                                rect[0] += sgn * STEP_X
                                rect[2] += sgn * STEP_X

                                dy = ((k // 2) + 1) * STEP_Y
                                v_offsets = [0] if k == 0 else ([dy] if k % 2 == 1 else [-dy])
                                placed = False
                                for off in v_offsets:
                                    test = [rect[0], rect[1] + off, rect[2], rect[3] + off]
                                    test = _shift_inside_frame(test)
                                    if not any(_rect_intersects(test, (px1, py1, px2, py2)) for (px1, py1, px2, py2, _) in placed_rects):
                                        rect = test; placed = True; break
                                if not placed:
                                    rect = _shift_inside_frame(rect)

                                iters += 1; k += 1

                            # Final rect & side (may have flipped)
                            x1, y1, x2, y2 = rect
                            st["side"] = side
                            placed_rects.append((x1, y1, x2, y2, side))

                            # ---- Leader line onto the LINES overlay (below boxes) ----
                            tmp_lines = np.zeros_like(frame_bgr)

                            # Leader line aimed at the final rect edge (prevents misalignment after clamping)
                            target_x = x1 if side == 'R' else x2
                            target_y = int(np.clip(py, y1 + BOX_RADIUS, y2 - BOX_RADIUS))
                            cv2.line(tmp_lines, (target_x, target_y), (px, py), (0, 0, 0), max(1, int(3 * scale_factor)), lineType=cv2.LINE_AA)
                            cv2.line(tmp_lines, (target_x, target_y), (px, py), (255, 255, 255), max(1, int(2 * scale_factor)), lineType=cv2.LINE_AA)

                            # Merge into lines overlay
                            region_l = tmp_lines.astype(np.uint8)
                            mask_l = (cv2.cvtColor(region_l, cv2.COLOR_BGR2GRAY) > 0).astype(np.uint8) * 255
                            overlay_lines_bgr[mask_l > 0] = region_l[mask_l > 0]
                            overlay_lines_mask[mask_l > 0] = 255

                            # ---- Box & contents onto the BOXES overlay (above lines) ----
                            tmp_box = np.zeros_like(frame_bgr)

                            draw_rounded_rect(tmp_box, x1, y1, x2, y2, radius=BOX_RADIUS,
                                              fill_color=fill_color_bgr, border_color=border_color_bgr, border_thickness=max(1, int(2 * scale_factor)))

                            # safe text insets
                            SAFE_PAD = max(1, int(2 * scale_factor))
                            tx_px = int(max(x1 + pad, x1 + SAFE_PAD))
                            center_y = y1 + (box_h / 2.0)
                            ty_px = int(center_y + (th / 2.0) - (baseline / 2.0))
                            cv2.putText(tmp_box, text, (tx_px, ty_px), font, scale, border_color_bgr, thickness, cv2.LINE_AA)

                            # degree donut — ensure it stays inside the box
                            # Thinner degree ring + nudge so its bottom aligns near the top of the numerals
                            EXTRA_DONUT_TOP_ALIGN = int(2 * scale_factor)  # baseline aligner
                            # Push the circle upward by a few px (i.e., add a bottom margin)
                            DEGREE_CIRCLE_BOTTOM_MARGIN = int(3 * scale_factor)
                            
                            donut_cx = int(np.clip(tx_px + tw + gap_between + donut_r,
                                                    x1 + SAFE_PAD + donut_r, x2 - SAFE_PAD - donut_r))
                            # place donut a few px higher (subtract bottom margin)
                            donut_cy = int(np.clip(ty_px - th + EXTRA_DONUT_TOP_ALIGN + donut_r - DEGREE_CIRCLE_BOTTOM_MARGIN,
                                                    y1 + SAFE_PAD + donut_r, y2 - SAFE_PAD - donut_r))
                            cv2.circle(tmp_box, (donut_cx, donut_cy), donut_r, border_color_bgr, donut_thk, lineType=cv2.LINE_AA)

                            # Merge into boxes overlay
                            region_b = tmp_box.astype(np.uint8)
                            mask_b = (cv2.cvtColor(region_b, cv2.COLOR_BGR2GRAY) > 0).astype(np.uint8) * 255
                            overlay_boxes_bgr[mask_b > 0] = region_b[mask_b > 0]
                            overlay_boxes_mask[mask_b > 0] = 255

                    # Composite every frame in order: lines first, then landmark circles, then boxes
                    if np.any(overlay_lines_mask):
                        frame_bgr[overlay_lines_mask > 0] = overlay_lines_bgr[overlay_lines_mask > 0]

                    # Draw landmark circles on TOP of leader lines (and under boxes)
                    if results.pose_landmarks is not None and 'landmark_centers' in locals():
                        # Use scaled styling for consistency across resolutions
                        # r_outer, r_white, r_inner are already defined above with scale_factor
                        for (cx, cy) in landmark_centers:
                            cv2.circle(frame_bgr, (cx, cy), r_outer, (0, 0, 0), -1, lineType=cv2.LINE_AA)
                            cv2.circle(frame_bgr, (cx, cy), r_white, (255, 255, 255), -1, lineType=cv2.LINE_AA)
                            cv2.circle(frame_bgr, (cx, cy), r_inner, (0, 0, 0), -1, lineType=cv2.LINE_AA)

                    if np.any(overlay_boxes_mask):
                        frame_bgr[overlay_boxes_mask > 0] = overlay_boxes_bgr[overlay_boxes_mask > 0]

                    writer.write(frame_bgr)
                    frames_processed += 1
                    written_idx += 1

                    # Performance monitoring (no adaptive frame skipping to avoid video speed issues)
                    frame_processing_time = time.time() - frame_start_time

                    # cleanup temps
                    del frame_rgb, results
        finally:
            try:
                writer.release()
            except Exception:
                pass
            try:
                if self.video_capture:
                    self.video_capture.release()
                    self.video_capture = None
            except Exception:
                pass

        return {
            "success": True,
            "outputVideoPath": output_path,
            "framesProcessed": frames_processed,
            "fps": output_fps,
            "originalFps": fps,
            "frameSkip": frame_skip,
            "resolution": {"width": frame_width, "height": frame_height},
            "originalResolution": {"width": original_frame_width, "height": original_frame_height},
            "effectiveOriginalResolution": {"width": effective_input_width, "height": effective_input_height},
        }

    def cleanup_temp_files(self, file_paths: list) -> None:
        """Clean up temporary files after processing."""
        for file_path in file_paths:
            try:
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"Cleaned up temporary file: {file_path}")
            except Exception as e:
                print(f"Warning: Failed to cleanup temporary file {file_path}: {e}")

    def cleanup_all_resources(self) -> None:
        """Comprehensive cleanup of all resources to prevent memory leaks."""
        try:
            # Release video capture
            if self.video_capture:
                self.video_capture.release()
                self.video_capture = None
            
            # Clean up video path
            if self.video_path and os.path.exists(self.video_path):
                try:
                    os.remove(self.video_path)
                    print(f"[LiftAnalysis] Cleaned up video file: {self.video_path}")
                except Exception as e:
                    print(f"[LiftAnalysis] Warning: Could not clean up video file {self.video_path}: {e}")
                self.video_path = None
            
            # Clean up all temporary files in /var/data/tmp
            self._cleanup_temp_directory()
            
            # Force garbage collection
            import gc
            collected = gc.collect()
            print(f"[LiftAnalysis] Memory cleanup: collected {collected} objects")
            
        except Exception as e:
            print(f"[LiftAnalysis] Warning: Error during resource cleanup: {e}")

    def _cleanup_temp_directory(self) -> None:
        """Clean up all temporary files in the temp directory."""
        try:
            if not os.path.exists(self.TMP_DIR):
                return
                
            # List all files in temp directory
            for filename in os.listdir(self.TMP_DIR):
                file_path = os.path.join(self.TMP_DIR, filename)
                try:
                    if os.path.isfile(file_path):
                        # Only clean up files that look like our temp files
                        if any(pattern in filename for pattern in ['tmp', 'formai', 'screenshot']):
                            os.remove(file_path)
                            print(f"[LiftAnalysis] Cleaned up temp file: {file_path}")
                    elif os.path.isdir(file_path):
                        # Clean up temp directories (like screenshot dirs)
                        if 'formai' in filename:
                            import shutil
                            shutil.rmtree(file_path)
                            print(f"[LiftAnalysis] Cleaned up temp directory: {file_path}")
                except Exception as e:
                    print(f"[LiftAnalysis] Warning: Could not clean up {file_path}: {e}")
                    
        except Exception as e:
            print(f"[LiftAnalysis] Warning: Error cleaning temp directory: {e}")

    def _get_supabase_public_url(self, bucket: str, storage_path: str) -> str:
        """Generate the full public URL for a Supabase storage path."""
        from config import settings
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"


    def analyze_pose_video_with_gemini(self, local_video_path: str, lift_name: str, reps: int) -> Dict[str, Any]:
        """Analyze the local pose video using Gemini AI with combined validation + analysis."""
        if not self.gemini_client:
            self._mark_job_failed("AI_ANALYSIS_FAILED")
            return {
                "success": False,
                "error": "Gemini AI client not configured - missing API key"
            }
        
        if not local_video_path or not os.path.exists(local_video_path):
            self._mark_job_failed("AI_ANALYSIS_FAILED")
            return {
                "success": False,
                "error": "Local video path is missing or file does not exist"
            }
        
        myfile = None
        try:
            # Upload and ensure file is ACTIVE before generation
            myfile = self._upload_and_wait_active(local_video_path)

            # Extract user data from lift payload
            gender = self.lift.get("gender")
            weight_kg = self.lift.get("weightKG")
            height_cm = self.lift.get("heightCM")
            
            # Use the combined validation + analysis prompt with explicit binding to this file id
            system_prompt = (
                get_validation_and_analysis_prompt(lift_name, reps, gender, weight_kg, height_cm)
                + f"\n\nONLY analyze the attached file id: {myfile.name}. Ignore any previous files."
            )

            # Configure structured JSON output to eliminate parsing issues
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": self.LIFT_VALIDATION_AND_ANALYSIS_SCHEMA,
            }

            # Generate with a small, targeted retry in case of ACTIVE race
            response = None
            for attempt in range(2):
                try:
                    response = self.gemini_client.models.generate_content(
                        model=self.gemini_model_name,
                        contents=[myfile, system_prompt],
                        config=generation_config
                    )
                    break
                except Exception as e:
                    msg = str(e)
                    if "not in an ACTIVE state" in msg and attempt == 0:
                        # Wait briefly and recheck
                        try:
                            self._upload_and_wait_active(local_video_path, timeout_s=60)
                        except Exception:
                            pass
                        time.sleep(1.0)
                        continue
                    raise

            if not response:
                raise Exception("Empty or invalid response from Gemini")

            # Prefer structured output first
            cleaned_response = None

            if getattr(response, "parsed", None):
                cleaned_response = response.parsed
            else:
                # Some SDKs expose JSON parts with a mime_type
                try:
                    cands = getattr(response, "candidates", None) or []
                    parts = getattr(cands[0].content, "parts", []) if cands else []
                    for p in parts:
                        if getattr(p, "mime_type", None) == "application/json":
                            cleaned_response, _ = _robust_json_parse(getattr(p, "text", "") or "")
                            break
                except Exception:
                    pass

                if cleaned_response is None:
                    # Fall back to the raw text + robust parser
                    try:
                        parsed, debug_steps = _robust_json_parse(getattr(response, "text", "") or "")
                        cleaned_response = parsed
                        print(f"[LiftAnalysis] JSON recovered via steps: {debug_steps}")
                    except ValueError as e:
                        print(f"[LiftAnalysis] Robust JSON parsing failed: {e}")
                        self._mark_job_failed("AI_ANALYSIS_FAILED")
                        return {
                            "success": False,
                            "error": f"GEMINI_JSON_PARSE_FAILED: {str(e)}",
                        }

            # Defensive result handling
            if not isinstance(cleaned_response, dict):
                print(f"[LiftAnalysis] Invalid response type: {type(cleaned_response)}")
                self._mark_job_failed("AI_ANALYSIS_FAILED")
                return {"success": False, "error": "INVALID_RESPONSE_TYPE"}

            # Optional schema validation
            try:
                from jsonschema import validate
                validate(instance=cleaned_response, schema=self.LIFT_VALIDATION_AND_ANALYSIS_SCHEMA)
            except ImportError:
                # jsonschema not available, skip validation
                pass
            except Exception as ve:
                print(f"[LiftAnalysis] Schema validation failed: {ve}")
                self._mark_job_failed("AI_ANALYSIS_FAILED")
                return {"success": False, "error": "INVALID_RESPONSE_SCHEMA"}

            print(f"[LiftAnalysis] Parsed response: {cleaned_response}")

            # Validate structure and branch on validation.valid
            validation_obj = cleaned_response.get("validation")
            analysis_obj = cleaned_response.get("analysis")
            
            if not isinstance(validation_obj, dict) or "valid" not in validation_obj:
                print(f"[LiftAnalysis] Invalid validation object structure: {validation_obj}")
                self._mark_job_failed("AI_ANALYSIS_FAILED")
                return {"success": False, "error": f"INVALID_VALIDATION_STRUCTURE: {type(validation_obj).__name__}"}

            valid_flag = validation_obj.get("valid")

            # If not TRUE, return early with validation and placeholder analysis
            if valid_flag != "TRUE":
                if not isinstance(analysis_obj, dict):
                    analysis_obj = {
                        "accuracy": 0.0,
                        "reps": 0,
                        "lineGraphValues": [],
                        "barChartValues": [],
                        "feedback": [],
                    }
                return {
                    "success": True,
                    "validation": validation_obj,
                    "feedback": analysis_obj,
                }

            # Proceed with screenshots only when valid
            timestamps = self._extract_timestamps_from_feedback(analysis_obj)
            screenshots = self._create_screenshots_at_timestamps(local_video_path, timestamps)
            uploaded_screenshots = self._upload_screenshots_to_storage(screenshots)
            analysis_with_images = self._transform_feedback_with_image_urls(analysis_obj, uploaded_screenshots)

            return {
                "success": True,
                "validation": validation_obj,
                "feedback": analysis_with_images,
            }

        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"[LiftAnalysis] Exception in analyze_pose_video_with_gemini: {error_type}: {error_msg}")
            import traceback
            print(f"[LiftAnalysis] Traceback: {traceback.format_exc()}")
            
            self._mark_job_failed("AI_ANALYSIS_FAILED")
            return {
                "success": False,
                "error": f"GEMINI_ANALYSIS_EXCEPTION: {error_type}: {error_msg}",
            }
        finally:
            try:
                if myfile is not None:
                    self.gemini_client.files.delete(name=myfile.name)
            except Exception as cleanup_error:
                print(f"Warning: Failed to cleanup Gemini file {getattr(myfile, 'name', 'unknown')}: {cleanup_error}")


    def _extract_timestamps_from_feedback(self, feedback_data: Dict[str, Any]) -> list:
        """Extract all timestamps from the feedback array in the cleaned response."""
        timestamps = []
        
        try:
            # Check if feedback_data has the expected structure
            if not isinstance(feedback_data, dict):
                return timestamps
            
            # Look for feedback array in different possible locations
            feedback_array = None
            
            # Check if feedback is directly in the root
            if "feedback" in feedback_data and isinstance(feedback_data["feedback"], list):
                feedback_array = feedback_data["feedback"]
            # Check if feedback is nested under "analysis" (as per the prompt schema)
            elif "analysis" in feedback_data and isinstance(feedback_data["analysis"], dict):
                if "feedback" in feedback_data["analysis"] and isinstance(feedback_data["analysis"]["feedback"], list):
                    feedback_array = feedback_data["analysis"]["feedback"]
            
            if not feedback_array:
                return timestamps
            
            # Extract timestamps from each feedback entry
            for feedback_entry in feedback_array:
                if isinstance(feedback_entry, dict) and "timestamp" in feedback_entry:
                    timestamp = feedback_entry["timestamp"]
                    if isinstance(timestamp, (int, float)) and timestamp not in timestamps:
                        timestamps.append(timestamp)
            
            # Sort timestamps in ascending order
            timestamps.sort()
            
        except Exception as e:
            # Log error but don't fail the main analysis
            print(f"Warning: Failed to extract timestamps from feedback: {e}")
        
        return timestamps

    def _create_screenshots_at_timestamps(self, video_path: str, timestamps: list) -> Dict[str, str]:
        """Create screenshots from the video at the specified timestamps."""
        screenshots = {}
        
        if not timestamps or not video_path or not os.path.exists(video_path):
            return screenshots
        
        try:
            # Ensure video is OpenCV readable before creating screenshots
            try:
                video_path = self._ensure_opencv_readable(video_path)
            except Exception as e:
                print(f"Warning: Failed to make video OpenCV readable for screenshots: {e}")
                return screenshots
            
            # Open the video file with FFMPEG backend
            cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                print(f"Warning: Could not open video file for screenshots: {video_path}")
                return screenshots
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0:
                print(f"Warning: Invalid FPS for video: {fps}")
                cap.release()
                return screenshots
            
            print(f"[LiftAnalysis] Creating screenshots at timestamps: {timestamps}")
            
            # Create temporary directory for screenshots on mounted disk
            temp_dir = tempfile.mkdtemp(prefix="formai_screenshots_", dir=self.TMP_DIR)
            
            for timestamp in timestamps:
                try:
                    # Seek by time (milliseconds), not frame index
                    ms = max(0, int(timestamp * 1000))
                    cap.set(cv2.CAP_PROP_POS_MSEC, ms)
                    
                    # Grab a few frames to land on a keyframe (B-frame streams need this)
                    for _ in range(3):
                        cap.grab()
                    
                    # Read the frame
                    ret, frame = cap.read()
                    if not ret or frame is None or frame.size == 0:
                        print(f"Warning: Empty frame at ~{timestamp}s (ms={ms})")
                        continue
                    
                    # Generate filename for this screenshot
                    screenshot_filename = f"screenshot_{timestamp}s.png"
                    screenshot_path = os.path.join(temp_dir, screenshot_filename)
                    
                    # Save the screenshot
                    success = cv2.imwrite(screenshot_path, frame)
                    if success:
                        # Store the path in the screenshots object with timestamp as key
                        screenshots[str(timestamp)] = screenshot_path
                        print(f"Created screenshot at timestamp {timestamp}s: {screenshot_path}")
                    else:
                        print(f"Warning: Failed to save screenshot at timestamp {timestamp}s")
                        
                except Exception as e:
                    print(f"Warning: Error creating screenshot at timestamp {timestamp}s: {e}")
                    continue
            
            # Release the video capture
            cap.release()
            
        except Exception as e:
            print(f"Warning: Failed to create screenshots: {e}")
            # Note: Temporary directory cleanup is handled in _upload_screenshots_to_storage
        
        return screenshots

    def _upload_screenshots_to_storage(self, screenshots: Dict[str, str]) -> Dict[str, Optional[str]]:
        """Upload screenshots to Supabase Storage and return full public URLs."""
        uploaded_screenshots = {}
        
        if not screenshots:
            return uploaded_screenshots
        
        bucket = 'lifts'
        temp_dirs_to_cleanup = set()
        
        # Import supabase client here to avoid circular imports
        from supabase import create_client, Client
        from config import settings
        
        # Create Supabase client with service role key for admin access
        supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        
        for timestamp, local_path in screenshots.items():
            if not os.path.exists(local_path):
                print(f"Warning: Screenshot file not found: {local_path}")
                continue
                
            # Track temp directory for cleanup
            temp_dir = os.path.dirname(local_path)
            if temp_dir and 'formai_screenshots_' in temp_dir:
                temp_dirs_to_cleanup.add(temp_dir)
                
            try:
                # Generate storage path: userId/liftId/screenshots/screenshot_timestamp.png
                screenshot_filename = os.path.basename(local_path)
                storage_path = f"{self.userId}/{self.liftId}/screenshots/{screenshot_filename}"
                
                # Upload the screenshot to Supabase storage using streaming
                # Use the async client for streaming upload to avoid loading entire image into memory
                try:
                    # Build the public URL for direct HTTP upload
                    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"
                    
                    # Use streaming upload with httpx
                    with open(local_path, 'rb') as f:
                        with httpx.stream("POST", f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}",
                                        headers={
                                            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                                            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                                            "Content-Type": "image/png"
                                        },
                                        content=f,
                                        timeout=30.0) as resp:
                            if resp.status_code not in [200, 201]:
                                # Try PUT if POST fails (file might exist)
                                f.seek(0)  # Reset file pointer
                                with httpx.stream("PUT", f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}",
                                                headers={
                                                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                                                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                                                    "Content-Type": "image/png"
                                                },
                                                content=f,
                                                timeout=30.0) as resp2:
                                    if resp2.status_code not in [200, 201]:
                                        print(f"Warning: Failed to upload screenshot at timestamp {timestamp}s: HTTP {resp2.status_code}")
                                        uploaded_screenshots[timestamp] = None
                                        continue
                    
                    # Generate the public URL
                    uploaded_screenshots[timestamp] = public_url
                    print(f"Successfully uploaded screenshot at timestamp {timestamp}s: {public_url}")
                    
                except Exception as upload_error:
                    print(f"Warning: Failed to upload screenshot at timestamp {timestamp}s: {upload_error}")
                    uploaded_screenshots[timestamp] = None
                    continue
                    
            except Exception as e:
                print(f"Warning: Failed to process screenshot at timestamp {timestamp}s: {e}")
                uploaded_screenshots[timestamp] = None
                continue
        
        # Clean up temporary directories
        for temp_dir in temp_dirs_to_cleanup:
            try:
                import shutil
                shutil.rmtree(temp_dir)
                print(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as e:
                print(f"Warning: Failed to cleanup temporary directory {temp_dir}: {e}")
        
        return uploaded_screenshots

    def _transform_feedback_with_image_urls(self, cleaned_response: Dict[str, Any], uploaded_screenshots: Dict[str, Optional[str]]) -> Dict[str, Any]:
        """Transform the cleaned response by replacing timestamp keys with imageURL keys."""
        if not uploaded_screenshots:
            return cleaned_response
        
        # Create a deep copy to avoid modifying the original
        import copy
        transformed_response = copy.deepcopy(cleaned_response)
        
        def transform_feedback_array(feedback_array):
            """Transform a feedback array by replacing timestamp with imageURL."""
            if not isinstance(feedback_array, list):
                return feedback_array
                
            for feedback_entry in feedback_array:
                if isinstance(feedback_entry, dict):
                    # Check if this entry has a timestamp that matches our screenshots
                    if "timestamp" in feedback_entry:
                        timestamp = feedback_entry["timestamp"]
                        timestamp_str = str(timestamp)
                        
                        # If we have a screenshot for this timestamp, replace timestamp with imageURL
                        if timestamp_str in uploaded_screenshots:
                            screenshot_url = uploaded_screenshots[timestamp_str]
                            if screenshot_url:  # Only proceed if upload was successful
                                # Remove the timestamp key
                                del feedback_entry["timestamp"]
                                # Add the imageURL key - now contains the full Supabase URL
                                feedback_entry["imageURL"] = screenshot_url
                                print(f"Transformed feedback entry: timestamp {timestamp}s -> imageURL: {feedback_entry['imageURL']}")
                            else:
                                print(f"Warning: Screenshot upload failed for timestamp {timestamp}s, keeping timestamp")
        
        # Transform feedback array in different possible locations
        if "feedback" in transformed_response and isinstance(transformed_response["feedback"], list):
            transform_feedback_array(transformed_response["feedback"])
        elif "analysis" in transformed_response and isinstance(transformed_response["analysis"], dict):
            if "feedback" in transformed_response["analysis"] and isinstance(transformed_response["analysis"]["feedback"], list):
                transform_feedback_array(transformed_response["analysis"]["feedback"])
        
        return transformed_response

    async def upload_pose_video_async_chunked(self, output_path: str, storage_bucket: Optional[str] = None) -> Dict[str, Any]:
        """
        Async function to upload pose video to Supabase Storage using chunked streaming.
        More memory efficient than loading entire file into memory.
        """
        try:
            bucket = storage_bucket or 'lifts'
            file_name = os.path.basename(output_path)
            name_wo_ext, ext = os.path.splitext(file_name)
            # Make filename unique to avoid stale CDN or reuse issues
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            short_uuid = uuid.uuid4().hex[:6]
            upload_name = f"{self.liftId}_{timestamp}_{short_uuid}_pose{ext or '.mp4'}"
            storage_path = f"{self.userId}/{self.liftId}/poses/{upload_name}"

            print(f"[LiftAnalysis] Starting chunked upload: bucket={bucket}, storage_path={storage_path}")

            if not os.path.exists(output_path):
                raise FileNotFoundError(f"Output video file not found: {output_path}")

            file_size = os.path.getsize(output_path)
            print(f"[LiftAnalysis] File size: {file_size} bytes")

            # Stream file in chunks to avoid loading entire file into memory
            async def file_generator():
                import aiofiles
                async with aiofiles.open(output_path, 'rb') as f:
                    while True:
                        chunk = await f.read(1024 * 1024)  # 1MB chunks
                        if not chunk:
                            break
                        yield chunk

            try:
                print(f"[LiftAnalysis] Attempting chunked POST upload")
                response = await self.supabase_client.post(
                    f"/storage/v1/object/{bucket}/{storage_path}",
                    content=file_generator(),
                    headers={"Content-Type": "video/mp4"},
                    timeout=60.0
                )
                print(f"[LiftAnalysis] POST upload response: {response.status_code}")

                if response.status_code not in [200, 201]:
                    print(f"[LiftAnalysis] POST upload failed, trying PUT...")
                    # If file exists, update it
                    response = await self.supabase_client.put(
                        f"/storage/v1/object/{bucket}/{storage_path}",
                        content=file_generator(),
                        headers={"Content-Type": "video/mp4"},
                        timeout=60.0
                    )
                    print(f"[LiftAnalysis] PUT upload response: {response.status_code}")

            except Exception as e:
                print(f"[LiftAnalysis] Chunked upload failed: {e}")
                raise

            if response.status_code not in [200, 201]:
                raise Exception(f"Upload failed with status {response.status_code}: {response.text}")

            # Construct the full Supabase public URL
            from config import settings
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"
            print(f"[LiftAnalysis] Chunked upload successful: {public_url}")

            # Clean up the local file
            try:
                os.remove(output_path)
                print(f"[LiftAnalysis] Cleaned up local file: {output_path}")
            except Exception as e:
                print(f"[LiftAnalysis] Warning: Failed to cleanup local file: {e}")

            return {
                "success": True,
                "storageBucket": bucket,
                "storagePath": storage_path,
                "publicUrl": public_url,
                "error": None,
            }

        except Exception as e:
            print(f"[LiftAnalysis] Chunked upload failed with error: {e}")
            import traceback
            print(f"[LiftAnalysis] Upload traceback: {traceback.format_exc()}")
            self._mark_job_failed("POSE_VIDEO_UPLOAD_FAILED")
            return {
                "success": False,
                "storageBucket": (storage_bucket or 'lifts'),
                "storagePath": "",
                "publicUrl": None,
                "error": str(e),
            }


    def analyze_and_upload_lift_data(self, local_video_path: str, lift_name: str, reps: int, pose_video_url: str, job_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Synchronous method that combines Gemini analysis and database upload.
        This method runs in the executor to avoid blocking the event loop.
        """
        try:
            print(f"[LiftAnalysis] Starting analyze_and_upload_lift_data for job_id={job_id}")
            print(f"[LiftAnalysis] Parameters: lift_name={lift_name}, reps={reps}, pose_video_url={pose_video_url}")
            
            # First, run the Gemini analysis
            print(f"[LiftAnalysis] Starting Gemini analysis for job_id={job_id}")
            gemini_result = self.analyze_pose_video_with_gemini(local_video_path, lift_name, reps)
            
            if not gemini_result.get("success"):
                error_details = gemini_result.get('error', 'Unknown error')
                print(f"[LiftAnalysis] Gemini analysis failed for job_id={job_id}: {error_details}")
                self._mark_job_failed("AI_ANALYSIS_FAILED")
                return {"success": False, "error": f"GEMINI_ANALYSIS_FAILED: {error_details}", "stage": "AI_ANALYSIS"}
            
            print(f"[LiftAnalysis] Gemini analysis successful for job_id={job_id}")
            print(f"[LiftAnalysis] Gemini result: {gemini_result}")
            # Get the analysis data from Gemini result
            analysis_obj = gemini_result.get("feedback", {})
            is_valid = gemini_result.get("validation", {}).get("valid", "TRUE")
            print(f"[LiftAnalysis] Analysis object keys: {list(analysis_obj.keys()) if isinstance(analysis_obj, dict) else 'Not a dict'}")
            
            # Create a synchronous database upload using the supabase client directly
            print(f"[LiftAnalysis] Starting database upload for job_id={job_id}")
            upload_result = self.upload_lift_data_sync(pose_video_url, analysis_obj, is_valid, job_id)
            
            print(f"[LiftAnalysis] Database upload successful for job_id={job_id}")
            
            return upload_result
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"[LiftAnalysis] Error in analyze_and_upload_lift_data for job_id={job_id}: {error_type}: {error_msg}")
            import traceback
            print(f"[LiftAnalysis] Traceback: {traceback.format_exc()}")
            self._mark_job_failed("AI_ANALYSIS_FAILED")
            return {"success": False, "error": f"ANALYZE_AND_UPLOAD_EXCEPTION: {error_type}: {error_msg}", "stage": "AI_ANALYSIS"}

    def upload_lift_data_sync(self, pose_video_url: str, analysis_obj: Dict[str, Any], is_valid: str, job_id: Optional[str] = None) -> Dict[str, Any]:
        """Synchronous version of upload_lift_data for use in thread executor."""
        try:
            print(f"[LiftAnalysis] Starting upload_lift_data_sync for job_id={job_id}")
            print(f"[LiftAnalysis] User ID: {self.userId}, Lift ID: {self.liftId}")
            
            # Create the final payload for database insertion
            final_payload: Dict[str, Any] = {
                "id": self.liftId,
                "user_id": self.userId,
                "is_favourite": False,
                "lift_type": self.lift.get("movementType"),
                "lift_date": self.lift.get("dateToday"),
                "lift_time": self.lift.get("timeToday"),
                "metric_weight": self.lift.get("metricWeight"),
                "reps": self.lift.get("reps"),
                "raw_video_url": self.lift.get("videoLink"),
                "pose_video_url": pose_video_url,
                "thumbnail_url": self.lift.get("thumbnailUri"),
                "is_valid": is_valid,
                "analysis": analysis_obj,
                "asset_id": (job_id or self.lift.get("assetId") or self.liftId),
            }
            
            print(f"[LiftAnalysis] Final payload created for job_id={job_id}: {final_payload}")
            
            # Use synchronous supabase client for database operations
            from supabase import create_client, Client
            from config import settings
            
            print(f"[LiftAnalysis] Creating Supabase client for job_id={job_id}")
            # Create Supabase client with service role key for admin access
            supabase: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            
            print(f"[LiftAnalysis] Upserting lift data to database for job_id={job_id}")
            # Upsert the lift data into Supabase lifts table (handles duplicate key constraints)
            response = supabase.table("lifts").upsert(final_payload).execute()
            
            print(f"[LiftAnalysis] Database upsert successful for job_id={job_id}, response data: {len(response.data)} records")
            
            # Add the upserted record ID to the final payload
            final_payload["id"] = self.liftId
            streak_date = final_payload["lift_date"].split("T")[0] if "T" in str(final_payload["lift_date"]) else str(final_payload["lift_date"])
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            is_streak_today = (streak_date == today)
            
            print(f"[LiftAnalysis] Upload completed successfully for job_id={job_id}, is_streak_today={is_streak_today}")
            return {"success": True, "data": final_payload, "is_streak": is_streak_today}
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"[LiftAnalysis] Error inserting lift data for job_id={job_id}: {error_type}: {error_msg}")
            import traceback
            print(f"[LiftAnalysis] Traceback: {traceback.format_exc()}")
            self._mark_job_failed("LIFT_UPLOAD_FAILED")
            return {"success": False, "error": f"LIFT_UPLOAD_EXCEPTION: {error_type}: {error_msg}", "stage": "LIFT_UPLOAD"}

    

    async def find_and_download_existing_pose_video(self, lift_id: str) -> Dict[str, Any]:
        """
        Find and download an existing pose video from storage for the given lift.
        Returns a dict with success status, pose_video_url, and local_pose_video_path.
        """
        try:
            # List objects under the user's lift-specific pose directory
            pose_prefix = f"{self.userId}/{lift_id}/poses/"
            pose_objects_response = await self.supabase_client.post(
                "/storage/v1/object/list/lifts",
                json={"prefix": pose_prefix, "limit": 100, "offset": 0},
                headers={"Content-Type": "application/json"},
                timeout=30.0,
            )
            
            if pose_objects_response.status_code != 200:
                self._mark_job_failed("FAILED_TO_LIST_POSE_OBJECTS")
                return {
                    "success": False,
                    "error": "FAILED_TO_LIST_POSE_OBJECTS",
                    "pose_video_url": None,
                    "local_pose_video_path": None
                }
            
            pose_objects = pose_objects_response.json() or []
            pose_video_url = None
            
            # Look for pose videos that might match this lift
            # First try to find a pose video that matches the liftId
            for obj in pose_objects:
                obj_name = obj.get("name", "")
                if obj_name.endswith("_pose.mp4") and lift_id in obj_name:
                    # Found a pose video that matches this lift, construct the full URL
                    from config import settings
                    pose_video_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/lifts/{pose_prefix}{obj_name}"
                    break
            
            # If no specific match found, fail fast to avoid analyzing a wrong video
            if not pose_video_url:
                self._mark_job_failed("NO_POSE_VIDEO_FOUND")
                return {
                    "success": False,
                    "error": "NO_POSE_VIDEO_FOUND",
                    "pose_video_url": None,
                    "local_pose_video_path": None
                }
            
            # pose_video_url is guaranteed by earlier guard
            
            # Download the pose video locally for analysis
            local_pose_video_path = self._download_video_from_supabase(pose_video_url)
            if not local_pose_video_path:
                self._mark_job_failed("FAILED_TO_DOWNLOAD_POSE_VIDEO")
                return {
                    "success": False,
                    "error": "FAILED_TO_DOWNLOAD_POSE_VIDEO",
                    "pose_video_url": pose_video_url,
                    "local_pose_video_path": None
                }
            
            # Set the pose video URL in the analysis object
            self.pose_video_url = pose_video_url
            
            print(f"Found existing pose video, downloaded to: {local_pose_video_path}")
            
            return {
                "success": True,
                "error": None,
                "pose_video_url": pose_video_url,
                "local_pose_video_path": local_pose_video_path
            }
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"Error finding and downloading existing pose video: {error_type}: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            self._mark_job_failed("POSE_VIDEO_DOWNLOAD_FAILED")
            return {
                "success": False,
                "error": f"POSE_VIDEO_DOWNLOAD_EXCEPTION: {error_type}: {error_msg}",
                "pose_video_url": None,
                "local_pose_video_path": None
            }
