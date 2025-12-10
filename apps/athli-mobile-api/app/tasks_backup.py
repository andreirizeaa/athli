import asyncio
import os
import traceback
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from celery_app import celery
from db_helpers import jobs_upsert, utcnow_iso
from supabase_sr import sr
from lib.LiftAnalsis import LiftAnalysis  # your class (keep path as in your repo)
from utils.logger import worker_logger, log_with_context
from utils.push_notifications import send_lift_complete_push, send_lift_failed_push

@celery.task
def ping(x):
    print(f"PING {x}")
    return x

def _ensure_asset_id(payload_lift: Dict[str, Any], job_id: str) -> Dict[str, Any]:
    # Make sure assetId exists — crucial for idempotency and client lookup
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

@celery.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def analyze_lift_task(self, job_id: str, user_id: str, lift_id: str, lift_payload: Dict[str, Any], has_hd_videos: Optional[bool] = False) -> bool:
    """
    Durable, idempotent lift analysis task.
    - Always writes the final row with id=lift_id and asset_id=job_id.
    - Updates jobs table for status/progress.
    """
    try:
        log_with_context(worker_logger, "info", f"Starting lift analysis task", user_id=user_id, job_id=job_id, component="worker")
        # mark running
        # Composite key: lift_id, asset_id, user_id
        jobs_upsert(lift_id, job_id, user_id, status="running", progress=10, started_at=utcnow_iso(), error=None, is_streak=False)
        log_with_context(worker_logger, "info", f"Job marked as running", user_id=user_id, job_id=job_id, component="worker")

        # Ensure assetId present
        lift_payload = _ensure_asset_id(lift_payload, job_id)

        # Build analysis object with proper Supabase client (use service role for storage uploads)
        import httpx
        from config import settings
        supabase_client = httpx.AsyncClient(
            base_url=settings.SUPABASE_URL,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            }
        )
        analysis = LiftAnalysis(userId=user_id, lift=lift_payload, liftId=lift_id, supabase_client=supabase_client)

        # 1) Ensure we have a video URI (skip separate validation; handled inside AI prompt)
        if not analysis.video_uri:
            log_with_context(worker_logger, "error", f"No video URI provided", user_id=user_id, job_id=job_id, component="worker")
            raise RuntimeError("NO_VIDEO_URI")

        jobs_upsert(lift_id, job_id, user_id, status="running", progress=25, error=None, is_streak=False)

        # 2) Pose skeleton (sync)
        log_with_context(worker_logger, "info", f"Starting pose estimation", user_id=user_id, job_id=job_id, component="worker")
        pose = analysis.add_pose_skeleton()
        if not pose.get("success"):
            log_with_context(worker_logger, "error", f"Pose estimation failed: {pose.get('error', 'Unknown error')}", user_id=user_id, job_id=job_id, component="worker")
            raise RuntimeError(pose.get("error", "POSE_ESTIMATION_FAILED"))

        output_path = pose.get("outputVideoPath")
        if not output_path:
            log_with_context(worker_logger, "error", f"No output video path generated", user_id=user_id, job_id=job_id, component="worker")
            raise RuntimeError("NO_OUTPUT_VIDEO_PATH")
        log_with_context(worker_logger, "info", f"Pose estimation successful, output: {output_path}", user_id=user_id, job_id=job_id, component="worker")

        # 3) Compress quickly for faster upload/analysis when possible (skip if hasHdVideos is True)
        if has_hd_videos:
            compressed_path = output_path
            log_with_context(worker_logger, "info", f"Skipping compression for HD video", user_id=user_id, job_id=job_id, component="worker")
        else:
            try:
                compressed_path = analysis.get_fast_compressed_copy(output_path)
                if compressed_path != output_path:
                    log_with_context(worker_logger, "info", f"Compressed pose video for speed: {compressed_path}", user_id=user_id, job_id=job_id, component="worker")
                else:
                    log_with_context(worker_logger, "info", f"Using original pose video (no compression available)", user_id=user_id, job_id=job_id, component="worker")
            except Exception:
                compressed_path = output_path
                log_with_context(worker_logger, "warn", f"Compression failed; proceeding with original video", user_id=user_id, job_id=job_id, component="worker")

        # 4) Upload pose video (async method -> run with asyncio) and keep local copy to avoid immediate CDN lag
        log_with_context(worker_logger, "info", f"Starting pose video upload", user_id=user_id, job_id=job_id, component="worker")
        async def _upload_pose():
            return await analysis.upload_pose_video_async(compressed_path, 'lifts', keep_local_file=True)

        up = asyncio.run(_upload_pose())
        if not up.get("success"):
            log_with_context(worker_logger, "error", f"Pose video upload failed: {up.get('error', 'Unknown error')}", user_id=user_id, job_id=job_id, component="worker")
            raise RuntimeError("POSE_VIDEO_UPLOAD_FAILED")

        analysis.pose_video_url = up.get("publicUrl")
        log_with_context(worker_logger, "info", f"Pose video upload successful, URL: {analysis.pose_video_url}", user_id=user_id, job_id=job_id, component="worker")

        jobs_upsert(lift_id, job_id, user_id, status="running", progress=55, error=None, is_streak=False)

        # 5) Use the local file we just uploaded (prefer compressed if exists), fall back to download with retries if not present
        local_pose_video_path = compressed_path if os.path.exists(compressed_path) else (output_path if os.path.exists(output_path) else None)
        if not local_pose_video_path:
            log_with_context(worker_logger, "warn", f"Local pose video missing post-upload, attempting to download via URL", user_id=user_id, job_id=job_id, component="worker", extra_fields={"pose_video_url": analysis.pose_video_url})
            local_pose_video_path = analysis._download_video_from_supabase(analysis.pose_video_url)
        if not local_pose_video_path:
            log_with_context(worker_logger, "error", f"Failed to obtain pose video", user_id=user_id, job_id=job_id, component="worker", extra_fields={"pose_video_url": analysis.pose_video_url})
            raise RuntimeError("FAILED_TO_DOWNLOAD_POSE_VIDEO")
        log_with_context(worker_logger, "info", f"Pose video ready at: {local_pose_video_path}", user_id=user_id, job_id=job_id, component="worker")

        # 5) AI analysis + DB upsert (sync)
        log_with_context(worker_logger, "info", f"Starting AI analysis", user_id=user_id, job_id=job_id, component="worker")
        # This calls analyze_pose_video_with_gemini (sync) and upload_lift_data_sync (sync).
        # Ensure upload_lift_data_sync always sets asset_id = job_id (see diff below).
        res = analysis.analyze_and_upload_lift_data(
            local_video_path=local_pose_video_path,  # Now we have the local pose video
            lift_name=lift_payload.get("movementType"),
            reps=lift_payload.get("reps"),
            pose_video_url=analysis.pose_video_url,
            job_id=job_id,
        )

        if not res.get("success"):
            log_with_context(worker_logger, "error", f"AI analysis failed: {res.get('error', 'Unknown error')}", user_id=user_id, job_id=job_id, component="worker")
            raise RuntimeError(res.get("error", "AI_ANALYSIS_FAILED"))
        log_with_context(worker_logger, "info", f"AI analysis successful", user_id=user_id, job_id=job_id, component="worker")

        # Clean up local pose video file
        try:
            if local_pose_video_path and os.path.exists(local_pose_video_path):
                os.remove(local_pose_video_path)
                log_with_context(worker_logger, "info", f"Cleaned up local pose video file", user_id=user_id, job_id=job_id, component="worker")
        except Exception as cleanup_error:
            log_with_context(worker_logger, "warn", f"Failed to cleanup local pose video: {cleanup_error}", user_id=user_id, job_id=job_id, component="worker")

        # Mark success and include streak information
        is_streak_updated = res.get("is_streak", False)
        jobs_upsert(lift_id, job_id, user_id, status="succeeded", progress=100, finished_at=utcnow_iso(), error=None, is_streak=is_streak_updated)
        log_with_context(worker_logger, "info", f"Job completed successfully", user_id=user_id, job_id=job_id, component="worker", extra_fields={"is_streak": is_streak_updated})
        
        # Send push notification to user devices that the lift analysis is complete
        asset_id = lift_payload.get("assetId", job_id)
        push_sent = send_lift_complete_push(user_id, asset_id, job_id)
        if push_sent:
            log_with_context(worker_logger, "info", f"Push notification sent successfully", user_id=user_id, job_id=job_id, component="worker", extra_fields={"asset_id": asset_id})
        else:
            log_with_context(worker_logger, "warn", f"Failed to send push notification", user_id=user_id, job_id=job_id, component="worker", extra_fields={"asset_id": asset_id})
        
        # Clean up Supabase client
        try:
            asyncio.run(supabase_client.aclose())
        except Exception:
            pass
            
        return True

    except Exception as e:
        # Map specific messages for client friendliness
        msg = str(e)
        log_with_context(worker_logger, "error", f"Job failed with error: {msg}", user_id=user_id, job_id=job_id, component="worker", extra_fields={"error_type": type(e).__name__})
        
        if "WRONG_MOVEMENT" in msg:
            err = "WRONG_MOVEMENT"
        elif "NO_GYM_VIDEO_FOUND" in msg:
            err = "NO_GYM_VIDEO_FOUND"
        elif "VIDEO_VALIDATION_FAILED" in msg:
            err = "VIDEO_VALIDATION_FAILED"
        elif "POSE_ESTIMATION_FAILED" in msg:
            err = "POSE_ESTIMATION_FAILED"
        elif "POSE_VIDEO_UPLOAD_FAILED" in msg:
            err = "POSE_VIDEO_UPLOAD_FAILED"
        elif "AI_ANALYSIS_FAILED" in msg:
            err = "AI_ANALYSIS_FAILED"
        else:
            err = msg or "ERROR_OCCURED"

        log_with_context(worker_logger, "error", f"Mapped error: {err}", user_id=user_id, job_id=job_id, component="worker")
        jobs_upsert(lift_id, job_id, user_id, status="failed", progress=100, finished_at=utcnow_iso(), error=err, is_streak=False)
        
        # Send push notification to user devices that the lift analysis failed
        asset_id = lift_payload.get("assetId", job_id)
        failure_stage = _determine_failure_stage(msg)
        push_sent = send_lift_failed_push(user_id, asset_id, err, failure_stage, job_id)
        if push_sent:
            log_with_context(worker_logger, "info", f"Failure push notification sent successfully", user_id=user_id, job_id=job_id, component="worker", extra_fields={"asset_id": asset_id, "error_code": err, "stage": failure_stage})
        else:
            log_with_context(worker_logger, "warn", f"Failed to send failure push notification", user_id=user_id, job_id=job_id, component="worker", extra_fields={"asset_id": asset_id, "error_code": err, "stage": failure_stage})
        
        # Clean up local pose video file if it exists
        try:
            if 'local_pose_video_path' in locals() and local_pose_video_path and os.path.exists(local_pose_video_path):
                os.remove(local_pose_video_path)
                log_with_context(worker_logger, "info", f"Cleaned up local pose video file for failed job", user_id=user_id, job_id=job_id, component="worker")
        except Exception:
            pass
        
        # Clean up Supabase client
        try:
            asyncio.run(supabase_client.aclose())
        except Exception:
            pass
            
        # no re-raise to avoid exponential retries on hard failures
        return False
