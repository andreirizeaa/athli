from fastapi import APIRouter, status, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from lib.LiftAnalsis import LiftAnalysis
from db_helpers import jobs_upsert, utcnow_iso, jobs_get_by_composite, _maybe_timeout_job
from utils.logger import api_logger, log_with_context

lifts_router = APIRouter(prefix="/lifts", tags=["Lifts"])


class LiftData(BaseModel):
    id: Optional[str] = None
    videoLink: Optional[str] = None
    thumbnailUri: Optional[str] = None
    movementType: Optional[str] = None
    metricWeight: Optional[float] = None
    reps: Optional[int] = None
    dateToday: Optional[str] = None
    timeToday: Optional[str] = None
    assetId: Optional[str] = None


class UserData(BaseModel):
    gender: Optional[str] = None
    heightCM: Optional[float] = None
    weightKG: Optional[float] = None


class AnalyzeLiftPayload(BaseModel):
    userId: str
    liftId: str
    lift: LiftData
    userData: UserData
    stage: Optional[str] = None
    hasHdVideos: Optional[bool] = False


@lifts_router.post("/analyse", status_code=status.HTTP_202_ACCEPTED)
async def enqueue_analysis(body: AnalyzeLiftPayload):
    job_id = body.lift.assetId or body.liftId
    log_with_context(api_logger, "info", f"Enqueuing lift analysis", user_id=body.userId, job_id=job_id, component="api", extra_fields={"lift_id": body.liftId})
    jobs_upsert(body.liftId, body.lift.assetId or body.liftId, body.userId, status="queued", progress=0, error=None, created_at=utcnow_iso(), is_streak=False)
    # Defer to new two-stage Celery pipeline
    from tasks import pose_stage

    # Get optimization parameters from environment or payload
    import os
    lift_data = body.lift.model_dump()
    
    # Add user data parameters
    lift_data["gender"] = body.userData.gender
    lift_data["heightCM"] = body.userData.heightCM
    lift_data["weightKG"] = body.userData.weightKG

    # High quality settings - no dynamic optimization
    lift_data["frame_skip"] = int(os.environ.get("POSE_FRAME_SKIP", "1"))  # Process every frame
    lift_data["target_height"] = int(os.environ.get("POSE_TARGET_HEIGHT", "1080"))  # Keep high resolution

    pose_stage.delay(job_id, body.userId, body.liftId, lift_data, body.hasHdVideos)
    log_with_context(api_logger, "info", f"Analysis task queued successfully", user_id=body.userId, job_id=job_id, component="api")
    return {"accepted": True, "job_id": job_id, "lift_id": body.liftId}


@lifts_router.get("/jobs/{job_id}")
async def job_status(job_id: str, userId: str = Query(...), liftId: str = Query(...)):
    data = jobs_get_by_composite(job_id, liftId, userId)
    if not data:
        return {
        "success": True,
            "data": None,
            "is_streak": False,
            "error": "JOB_NOT_FOUND"
        }

    data = _maybe_timeout_job(data)  # ⬅️ hard-enforce 10-min timeout

    return {
            "success": True,
            "data": data,
            "is_streak": data.get("is_streak", False),
        }
        

