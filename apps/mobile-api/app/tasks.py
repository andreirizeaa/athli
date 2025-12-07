import asyncio
import os
import traceback
import gc
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from celery_app import celery
from celery.exceptions import Reject
from db_helpers import jobs_upsert, utcnow_iso
from supabase_sr import sr
from lib.LiftAnalsis import LiftAnalysis
from utils.logger import worker_logger, log_with_context
from utils.push_notifications import send_lift_complete_push, send_lift_failed_push
from config import settings
from locks import try_acquire_user_lock, release_user_lock
import httpx

# Ensure temporary files are created on the mounted disk
os.environ.setdefault("TMPDIR", "/var/data/tmp")

@celery.task
def ping(x):
    print(f"PING {x}")
    return x

def cleanup_memory():
    """
    Safe memory cleanup to prevent memory leaks in worker processes.
    This should be called at the end of each worker task.
    """
    try:
        # Force garbage collection only
        collected = gc.collect()

        # Note: We avoid clearing module-level variables as this can break imports
        # Instead, rely on Python's garbage collector and proper object cleanup

        return collected
    except Exception as e:
        # Don't let memory cleanup errors break the main task
        print(f"Memory cleanup warning: {e}")
        return 0

def cleanup_temp_directory():
    """
    Clean up all temporary files in /var/data/tmp to prevent disk space issues.
    This should be called at the end of each worker task.
    """
    try:
        import os
        import shutil
        
        temp_dir = os.getenv("TMPDIR", "/var/data/tmp")
        if not os.path.exists(temp_dir):
            return
            
        # Clean up all files in temp directory
        for filename in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, filename)
            try:
                if os.path.isfile(file_path):
                    # Only clean up files that look like our temp files
                    if any(pattern in filename for pattern in ['tmp', 'formai', 'screenshot']):
                        os.remove(file_path)
                        print(f"[Worker] Cleaned up temp file: {file_path}")
                elif os.path.isdir(file_path):
                    # Clean up temp directories
                    if 'formai' in filename:
                        shutil.rmtree(file_path)
                        print(f"[Worker] Cleaned up temp directory: {file_path}")
            except Exception as e:
                print(f"[Worker] Warning: Could not clean up {file_path}: {e}")
                
    except Exception as e:
        print(f"[Worker] Warning: Error cleaning temp directory: {e}")

def _ensure_asset_id(payload_lift: Dict[str, Any], job_id: str) -> Dict[str, Any]:
    """Make sure assetId exists — crucial for idempotency and client lookup"""
    lift = dict(payload_lift or {})
    lift["assetId"] = lift.get("assetId") or job_id
    return lift

def _determine_failure_stage(error_msg: str) -> str:
    """Determine which stage the failure occurred in based on error message."""
    error_upper = str(error_msg).upper()
    if any(x in error_upper for x in ["VIDEO_VALIDATION", "WRONG_MOVEMENT", "NO_GYM_VIDEO_FOUND", "NO_VIDEO_URI"]):
        return "validate"
    elif "POSE_ESTIMATION" in error_upper:
        return "pose"
    elif "POSE_VIDEO_UPLOAD" in error_upper:
        return "upload"
    elif "AI_ANALYSIS" in error_upper:
        return "analyze"
    else:
        return "analyze"  # default fallback

async def aiter_file_chunks(path: str, chunk_size: int = 1048576):
    """Async generator for streaming file chunks"""
    import aiofiles
    async with aiofiles.open(path, "rb") as af:
        while True:
            chunk = await af.read(chunk_size)
            if not chunk:
                break
            yield chunk

@celery.task(
    name="tasks.pose_stage",
    queue="pose",
    bind=True,
    acks_late=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3
)
def pose_stage(self, job_id: str, user_id: str, lift_id: str, lift_payload: Dict[str, Any], has_hd_videos: Optional[bool] = False):
    """
    CPU-bound pose estimation stage.
    Handles video processing, pose skeleton overlay, and pose video upload.
    """
    try:
        log_with_context(worker_logger, "info", f"Starting pose stage", user_id=user_id, job_id=job_id, component="pose_worker")

        # === PER-USER LOCK: Try to acquire exclusive lock for this user ===
        if not try_acquire_user_lock(user_id, job_id):
            # User already has a running job → requeue this task immediately
            log_with_context(worker_logger, "info", f"User {user_id} already has a running job, requeuing task", user_id=user_id, job_id=job_id, component="pose_worker")
            raise Reject(f"user {user_id} already running a job", requeue=True)

        log_with_context(worker_logger, "info", f"Acquired user lock for pose stage", user_id=user_id, job_id=job_id, component="pose_worker")

        # Mark pose stage as running
        jobs_upsert(lift_id, job_id, user_id, status="running", progress=10, started_at=utcnow_iso(), error=None, is_streak=False)

        # Ensure assetId present
        lift_payload = _ensure_asset_id(lift_payload, job_id)

        # Get optimization parameters from payload with CPU-friendly defaults
        frame_skip = lift_payload.get("frame_skip", int(os.environ.get("POSE_FRAME_SKIP", "4")))
        target_height = lift_payload.get("target_height", int(os.environ.get("POSE_TARGET_HEIGHT", "320")))

        # Build analysis object (no async client needed for pose stage)
        analysis = LiftAnalysis(userId=user_id, lift=lift_payload, liftId=lift_id)

        # Ensure we have a video URI
        if not analysis.video_uri:
            log_with_context(worker_logger, "error", f"No video URI provided", user_id=user_id, job_id=job_id, component="pose_worker")
            raise RuntimeError("NO_VIDEO_URI")

        jobs_upsert(lift_id, job_id, user_id, status="running", progress=25, error=None, is_streak=False)

        # Pose skeleton with optimization parameters
        log_with_context(worker_logger, "info", f"Starting pose estimation with frame_skip={frame_skip}, target_height={target_height}", user_id=user_id, job_id=job_id, component="pose_worker")
        pose = analysis.add_pose_skeleton(target_height=target_height, frame_skip=frame_skip)

        if not pose.get("success"):
            log_with_context(worker_logger, "error", f"Pose estimation failed: {pose.get('error', 'Unknown error')}", user_id=user_id, job_id=job_id, component="pose_worker")
            raise RuntimeError(pose.get("error", "POSE_ESTIMATION_FAILED"))

        output_path = pose.get("outputVideoPath")
        if not output_path:
            log_with_context(worker_logger, "error", f"No output video path generated", user_id=user_id, job_id=job_id, component="pose_worker")
            raise RuntimeError("NO_OUTPUT_VIDEO_PATH")

        log_with_context(worker_logger, "info", f"Pose estimation successful, output: {output_path}", user_id=user_id, job_id=job_id, component="pose_worker")

        # Compress for faster upload (skip if hasHdVideos is True)
        if has_hd_videos:
            compressed_path = output_path
            log_with_context(worker_logger, "info", f"Skipping compression for HD video", user_id=user_id, job_id=job_id, component="pose_worker")
        else:
            try:
                compressed_path = analysis.get_fast_compressed_copy(output_path)
                if compressed_path != output_path:
                    log_with_context(worker_logger, "info", f"Compressed pose video for speed: {compressed_path}", user_id=user_id, job_id=job_id, component="pose_worker")
                    # Clean up original output file immediately after compression
                    analysis.cleanup_temp_files([output_path])
                else:
                    log_with_context(worker_logger, "info", f"Using original pose video (no compression available)", user_id=user_id, job_id=job_id, component="pose_worker")
            except Exception:
                compressed_path = output_path
                log_with_context(worker_logger, "warn", f"Compression failed; proceeding with original video", user_id=user_id, job_id=job_id, component="pose_worker")

        jobs_upsert(lift_id, job_id, user_id, status="running", progress=50, error=None, is_streak=False)

        # Upload pose video with chunked streaming
        log_with_context(worker_logger, "info", f"Starting chunked pose video upload", user_id=user_id, job_id=job_id, component="pose_worker")

        async def _upload_pose_chunked():
            # Create async Supabase client for upload
            async with httpx.AsyncClient(
                base_url=settings.SUPABASE_URL,
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                },
                timeout=30.0
            ) as client:
                analysis.supabase_client = client
                return await analysis.upload_pose_video_async_chunked(compressed_path, 'lifts')

        up = asyncio.run(_upload_pose_chunked())
        if not up.get("success"):
            log_with_context(worker_logger, "error", f"Pose video upload failed: {up.get('error', 'Unknown error')}", user_id=user_id, job_id=job_id, component="pose_worker")
            raise RuntimeError("POSE_VIDEO_UPLOAD_FAILED")

        pose_video_url = up.get("publicUrl")
        log_with_context(worker_logger, "info", f"Pose video upload successful, URL: {pose_video_url}", user_id=user_id, job_id=job_id, component="pose_worker")

        # Clean up remaining local files (output_path may already be cleaned up)
        files_to_cleanup = [compressed_path]
        if compressed_path != output_path:
            files_to_cleanup.append(output_path)
        analysis.cleanup_temp_files(files_to_cleanup)

        # Mark pose stage complete and chain to analyze stage
        jobs_upsert(lift_id, job_id, user_id, status="running", progress=60, error=None, is_streak=False)
        log_with_context(worker_logger, "info", f"Pose stage completed, chaining to analyze stage", user_id=user_id, job_id=job_id, component="pose_worker")

        # Chain to I/O-bound analyze stage
        analyze_stage.delay(job_id, user_id, lift_id, lift_payload, pose_video_url)

        # Comprehensive cleanup before task completion
        analysis.cleanup_all_resources()
        cleanup_temp_directory()
        collected = cleanup_memory()
        log_with_context(worker_logger, "debug", f"Memory cleanup completed, collected {collected} objects", user_id=user_id, job_id=job_id, component="pose_worker")

        return True

    except Reject:
        # Let Celery handle the requeue; don't mark job as failed
        # The task will be put back on the queue for another worker to try
        log_with_context(worker_logger, "info", f"Task requeued due to user lock conflict", user_id=user_id, job_id=job_id, component="pose_worker")
        raise

    except Exception as e:
        msg = str(e)
        log_with_context(worker_logger, "error", f"Pose stage failed with error: {msg}", user_id=user_id, job_id=job_id, component="pose_worker", extra_fields={"error_type": type(e).__name__})

        # Release the user lock on failure
        try:
            release_user_lock(user_id, job_id)
        except Exception:
            pass

        # Map error for client - preserve actual error details
        if "NO_VIDEO_URI" in msg:
            err = msg  # Preserve the full error message
        elif "POSE_ESTIMATION_FAILED" in msg:
            err = msg  # Preserve the full error message
        elif "POSE_VIDEO_UPLOAD_FAILED" in msg:
            err = msg  # Preserve the full error message
        else:
            err = msg or "UNKNOWN_ERROR_OCCURED"

        jobs_upsert(lift_id, job_id, user_id, status="failed", progress=100, finished_at=utcnow_iso(), error=err, is_streak=False)

        # Send failure notification
        asset_id = lift_payload.get("assetId", job_id)
        failure_stage = _determine_failure_stage(msg)
        send_lift_failed_push(user_id, asset_id, err, failure_stage, job_id)

        # Comprehensive cleanup even on failure
        try:
            analysis.cleanup_all_resources()
        except:
            pass
        cleanup_temp_directory()
        collected = cleanup_memory()
        log_with_context(worker_logger, "debug", f"Memory cleanup completed after failure, collected {collected} objects", user_id=user_id, job_id=job_id, component="pose_worker")

        return False

@celery.task(
    name="tasks.analyze_stage",
    queue="analyze",
    bind=True,
    acks_late=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3
)
def analyze_stage(self, job_id: str, user_id: str, lift_id: str, lift_payload: Dict[str, Any], pose_video_url: str):
    """
    I/O-bound analysis stage.
    Handles AI analysis with Gemini and database operations.
    """
    try:
        log_with_context(worker_logger, "info", f"Starting analyze stage", user_id=user_id, job_id=job_id, component="analyze_worker")

        # Ensure assetId present
        lift_payload = _ensure_asset_id(lift_payload, job_id)

        # Build analysis object
        analysis = LiftAnalysis(userId=user_id, lift=lift_payload, liftId=lift_id)
        analysis.pose_video_url = pose_video_url

        jobs_upsert(lift_id, job_id, user_id, status="running", progress=70, error=None, is_streak=False)

        # Download pose video for analysis (small local copy for screenshots)
        log_with_context(worker_logger, "info", f"Downloading pose video for analysis", user_id=user_id, job_id=job_id, component="analyze_worker")
        local_pose_video_path = analysis._download_video_from_supabase(pose_video_url)

        if not local_pose_video_path:
            log_with_context(worker_logger, "error", f"Failed to download pose video", user_id=user_id, job_id=job_id, component="analyze_worker")
            raise RuntimeError("FAILED_TO_DOWNLOAD_POSE_VIDEO")

        jobs_upsert(lift_id, job_id, user_id, status="running", progress=80, error=None, is_streak=False)

        # AI analysis + DB upload (sync operations)
        log_with_context(worker_logger, "info", f"Starting AI analysis and database upload", user_id=user_id, job_id=job_id, component="analyze_worker")
        res = analysis.analyze_and_upload_lift_data(
            local_video_path=local_pose_video_path,
            lift_name=lift_payload.get("movementType"),
            reps=lift_payload.get("reps"),
            pose_video_url=pose_video_url,
            job_id=job_id,
        )

        if not res.get("success"):
            error_details = res.get('error', 'Unknown error')
            log_with_context(worker_logger, "error", f"AI analysis failed: {error_details}", user_id=user_id, job_id=job_id, component="analyze_worker", extra_fields={"error_details": error_details})
            raise RuntimeError(error_details)

        log_with_context(worker_logger, "info", f"AI analysis successful", user_id=user_id, job_id=job_id, component="analyze_worker")

        # Clean up local pose video file
        analysis.cleanup_temp_files([local_pose_video_path])

        # Mark success and include streak information
        is_streak_updated = res.get("is_streak", False)
        jobs_upsert(lift_id, job_id, user_id, status="succeeded", progress=100, finished_at=utcnow_iso(), error=None, is_streak=is_streak_updated)
        log_with_context(worker_logger, "info", f"Analyze stage completed successfully", user_id=user_id, job_id=job_id, component="analyze_worker", extra_fields={"is_streak": is_streak_updated})

        # Send success push notification
        asset_id = lift_payload.get("assetId", job_id)
        push_sent = send_lift_complete_push(user_id, asset_id, job_id)
        if push_sent:
            log_with_context(worker_logger, "info", f"Push notification sent successfully", user_id=user_id, job_id=job_id, component="analyze_worker", extra_fields={"asset_id": asset_id})
        else:
            log_with_context(worker_logger, "warn", f"Failed to send push notification", user_id=user_id, job_id=job_id, component="analyze_worker", extra_fields={"asset_id": asset_id})

        # Comprehensive cleanup before task completion
        analysis.cleanup_all_resources()
        cleanup_temp_directory()
        collected = cleanup_memory()
        log_with_context(worker_logger, "debug", f"Memory cleanup completed, collected {collected} objects", user_id=user_id, job_id=job_id, component="analyze_worker")

        return res

    except Exception as e:
        msg = str(e)
        log_with_context(worker_logger, "error", f"Analyze stage failed with error: {msg}", user_id=user_id, job_id=job_id, component="analyze_worker", extra_fields={"error_type": type(e).__name__})

        # Map error for client - preserve actual error details
        if "FAILED_TO_DOWNLOAD_POSE_VIDEO" in msg:
            err = msg  # Preserve the full error message
        elif "AI_ANALYSIS_FAILED" in msg:
            err = msg  # Preserve the full error message
        else:
            err = msg or "UNKNOWN_ERROR_OCCURED"

        jobs_upsert(lift_id, job_id, user_id, status="failed", progress=100, finished_at=utcnow_iso(), error=err, is_streak=False)

        # Send failure notification
        asset_id = lift_payload.get("assetId", job_id)
        failure_stage = _determine_failure_stage(msg)
        send_lift_failed_push(user_id, asset_id, err, failure_stage, job_id)

        # Clean up local files if they exist
        if 'local_pose_video_path' in locals() and local_pose_video_path:
            try:
                analysis = LiftAnalysis(userId=user_id, lift=lift_payload, liftId=lift_id)
                analysis.cleanup_temp_files([local_pose_video_path])
            except Exception:
                pass

        # Comprehensive cleanup even on failure
        try:
            if 'analysis' in locals():
                analysis.cleanup_all_resources()
        except:
            pass
        cleanup_temp_directory()
        collected = cleanup_memory()
        log_with_context(worker_logger, "debug", f"Memory cleanup completed after failure, collected {collected} objects", user_id=user_id, job_id=job_id, component="analyze_worker")

        return False
    finally:
        # === ALWAYS RELEASE USER LOCK: Ensure lock is released regardless of success/failure ===
        try:
            release_user_lock(user_id, job_id)
            log_with_context(worker_logger, "info", f"Released user lock after analyze stage completion", user_id=user_id, job_id=job_id, component="analyze_worker")
        except Exception as e:
            log_with_context(worker_logger, "warn", f"Failed to release user lock: {e}", user_id=user_id, job_id=job_id, component="analyze_worker")
