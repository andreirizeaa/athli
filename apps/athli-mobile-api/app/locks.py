import os
import redis
from typing import Optional

# Redis connection using the same URL as Celery
REDIS_URL = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://redis:6379/0"))
r = redis.Redis.from_url(REDIS_URL)

# Lock TTL should be longer than the maximum expected job runtime
# Set to 20 minutes to cover the entire pose + analyze pipeline
USER_LOCK_TTL_SECONDS = int(os.environ.get("USER_LOCK_TTL_SECONDS", str(20 * 60)))


def user_lock_key(user_id: str) -> str:
    """Generate Redis key for user lock."""
    return f"formai:userlock:{user_id}"


def try_acquire_user_lock(user_id: str, job_id: str) -> bool:
    """
    Try to acquire a lock for the given user.
    
    Args:
        user_id: The user ID to lock
        job_id: The job ID that will hold the lock
        
    Returns:
        bool: True if lock was acquired, False if user already has a running job
    """
    try:
        # SET NX with TTL so the lock is released if worker dies
        # NX = only set if key doesn't exist
        # EX = set expiration time in seconds
        return bool(r.set(user_lock_key(user_id), job_id, nx=True, ex=USER_LOCK_TTL_SECONDS))
    except Exception as e:
        # If Redis is down, fail open (allow the job to proceed)
        # This prevents Redis issues from blocking all jobs
        print(f"[Lock] Warning: Failed to acquire lock for user {user_id}: {e}")
        return True


def release_user_lock(user_id: str, job_id: str) -> None:
    """
    Release the lock for the given user, but only if we still own it.
    
    Args:
        user_id: The user ID to unlock
        job_id: The job ID that should own the lock
    """
    try:
        key = user_lock_key(user_id)
        
        # Use Redis pipeline with WATCH for atomic check-and-delete
        with r.pipeline() as p:
            while True:
                try:
                    # Watch the key for changes
                    p.watch(key)
                    
                    # Get current value
                    current = p.get(key)
                    
                    # Only delete if we still own the lock
                    if current is not None and current.decode() == job_id:
                        p.multi()
                        p.delete(key)
                        p.execute()
                        print(f"[Lock] Released lock for user {user_id}, job {job_id}")
                    else:
                        p.unwatch()
                        print(f"[Lock] Lock for user {user_id} already released or owned by different job")
                    
                    break
                except redis.WatchError:
                    # Key was modified between WATCH and MULTI, retry
                    continue
                    
    except Exception as e:
        # If Redis is down, log but don't fail the job
        print(f"[Lock] Warning: Failed to release lock for user {user_id}: {e}")


def check_user_lock(user_id: str) -> Optional[str]:
    """
    Check if a user has an active lock and return the job_id if so.
    
    Args:
        user_id: The user ID to check
        
    Returns:
        Optional[str]: The job_id holding the lock, or None if no lock exists
    """
    try:
        key = user_lock_key(user_id)
        result = r.get(key)
        return result.decode() if result else None
    except Exception as e:
        print(f"[Lock] Warning: Failed to check lock for user {user_id}: {e}")
        return None
