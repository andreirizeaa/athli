from datetime import datetime, timezone, timedelta
from supabase_sr import sr

JOB_TIMEOUT_MINUTES = 10  # hardcoded


def jobs_upsert(lift_id: str, asset_id: str, user_id: str, **fields):
    data = {"lift_id": lift_id, "asset_id": asset_id, "user_id": user_id, **fields}
    try:
        sr.table("jobs").upsert(data, on_conflict="lift_id,asset_id,user_id").execute()
    except Exception as e:
        print(f"Error in jobs_upsert for lift {lift_id} asset {asset_id} user {user_id}: {e}")
        raise


def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


def jobs_get_by_composite(asset_id: str, lift_id: str, user_id: str):
    """Get job status strictly by composite keys: (user_id, lift_id, asset_id)."""
    try:
        r = (
            sr.table("jobs")
            .select("*")
            .eq("user_id", user_id)
            .eq("lift_id", lift_id)
            .eq("asset_id", asset_id)
            .maybe_single()
            .execute()
        )
        if not r:
            return None
        return r.data
    except Exception as e:
        print(f"Error in jobs_get_by_composite for user {user_id} lift {lift_id} asset {asset_id}: {e}")
        return None


def _as_dt(x):
    if not x:
        return None
    return datetime.fromisoformat(str(x).replace("Z", "+00:00")).astimezone(timezone.utc)


def _maybe_timeout_job(row: dict) -> dict | None:
    """If job is >10 mins queued/running, mark failed with ERROR_OCCURED."""
    if not row:
        return None

    status = (row.get("status") or "").lower()
    if status in ("failed", "succeeded", "success", "completed"):
        return row

    created_at = _as_dt(row.get("created_at"))
    started_at = _as_dt(row.get("started_at"))
    baseline = started_at or created_at
    if not baseline:
        return row  # nothing to measure against

    now = datetime.now(timezone.utc)
    if now - baseline >= timedelta(minutes=JOB_TIMEOUT_MINUTES):
        try:
            (
                sr.table("jobs")
                .update({"status": "failed", "error": "ERROR_OCCURED"})
                .eq("user_id", row["user_id"])
                .eq("lift_id", row["lift_id"])
                .eq("asset_id", row["asset_id"])
                .execute()
            )
            # Re-fetch to return the updated row
            r = (
                sr.table("jobs")
                .select("*")
                .eq("user_id", row["user_id"])
                .eq("lift_id", row["lift_id"])
                .eq("asset_id", row["asset_id"])
                .maybe_single()
                .execute()
            )
            return r.data if r else row
        except Exception as e:
            print(f"[timeout] update failed for job {row.get('asset_id')}: {e}")
            # If update fails, fall back to returning original row
    return row

