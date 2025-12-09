import httpx
from typing import List, Dict, Any, Optional
from supabase_sr import sr
from utils.logger import worker_logger, log_with_context

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def get_user_expo_tokens(user_id: str) -> List[str]:
    """
    Fetch all Expo push tokens for a given user from the user_devices table.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        List of Expo push tokens for the user
    """
    try:
        response = sr.table("user_devices").select("token").eq("user_id", user_id).execute()
        tokens = [device["token"] for device in response.data if device.get("token")]
        log_with_context(
            worker_logger, 
            "info", 
            f"Retrieved {len(tokens)} push tokens for user", 
            user_id=user_id, 
            component="push_notifications"
        )
        return tokens
    except Exception as e:
        log_with_context(
            worker_logger, 
            "error", 
            f"Failed to retrieve push tokens: {str(e)}", 
            user_id=user_id, 
            component="push_notifications"
        )
        return []

def send_lift_failed_push(user_id: str, asset_id: str, error_code: str, stage: str = "analyze", job_id: Optional[str] = None) -> bool:
    """
    Send a silent/data push notification to all user devices when a lift analysis fails.
    
    Args:
        user_id: The user's UUID
        asset_id: The asset/lift ID that failed
        error_code: The error code (e.g. "WRONG_MOVEMENT", "NO_GYM_VIDEO_FOUND", etc.)
        stage: The stage where the failure occurred (default: "analyze")
        job_id: Optional job ID for logging context
        
    Returns:
        True if notifications were sent successfully, False otherwise
    """
    try:
        # Get all push tokens for the user
        tokens = get_user_expo_tokens(user_id)
        if not tokens:
            log_with_context(
                worker_logger, 
                "info", 
                "No push tokens found for user, skipping failure notification", 
                user_id=user_id, 
                job_id=job_id,
                component="push_notifications"
            )
            return True  # Not an error, just no tokens registered

        # Create messages for each token
        messages = []
        for token in tokens:
            message = {
                "to": token,
                "data": {
                    "type": "lift_failed",
                    "assetId": asset_id,
                    "error": error_code,
                    "stage": stage
                },
                "contentAvailable": True,  # iOS silent notification
                "priority": "high",        # Android high priority for data delivery
                # No title/body → data-only notification
            }
            messages.append(message)

        # Send push notifications via Expo Push API
        with httpx.Client(timeout=15) as client:
            response = client.post(EXPO_PUSH_URL, json=messages)
            response.raise_for_status()
            
            # Check for any errors in the response
            result = response.json()
            if isinstance(result, dict) and result.get("errors"):
                log_with_context(
                    worker_logger, 
                    "error", 
                    f"Expo push API returned errors for failure notification: {result.get('errors')}", 
                    user_id=user_id, 
                    job_id=job_id,
                    component="push_notifications"
                )
                return False
                
            log_with_context(
                worker_logger, 
                "info", 
                f"Successfully sent {len(messages)} failure push notifications", 
                user_id=user_id, 
                job_id=job_id,
                component="push_notifications",
                extra_fields={"asset_id": asset_id, "error_code": error_code, "stage": stage, "tokens_count": len(tokens)}
            )
            return True

    except Exception as e:
        if "timeout" in str(e).lower():
            log_with_context(
                worker_logger,
                "error",
                "Timeout while sending failure push notifications",
                user_id=user_id,
                job_id=job_id,
                component="push_notifications"
            )
        elif hasattr(e, 'status_code'):
            log_with_context(
                worker_logger,
                "error",
                f"HTTP error while sending failure push notifications: {getattr(e, 'status_code', 'unknown')} - {str(e)}",
                user_id=user_id,
                job_id=job_id,
                component="push_notifications"
            )
        else:
            log_with_context(
                worker_logger,
                "error",
                f"Error while sending failure push notifications: {str(e)}",
                user_id=user_id,
                job_id=job_id,
                component="push_notifications"
            )
        return False


def send_lift_complete_push(user_id: str, asset_id: str, job_id: Optional[str] = None) -> bool:
    """
    Send a silent/data push notification to all user devices when a lift analysis is complete.
    
    Args:
        user_id: The user's UUID
        asset_id: The asset/lift ID that completed
        job_id: Optional job ID for logging context
        
    Returns:
        True if notifications were sent successfully, False otherwise
    """
    try:
        # Get all push tokens for the user
        tokens = get_user_expo_tokens(user_id)
        if not tokens:
            log_with_context(
                worker_logger, 
                "info", 
                "No push tokens found for user, skipping notification", 
                user_id=user_id, 
                job_id=job_id,
                component="push_notifications"
            )
            return True  # Not an error, just no tokens registered

        # Create messages for each token
        messages = []
        for token in tokens:
            message = {
                "to": token,
                "data": {
                    "type": "lift_complete",
                    "assetId": asset_id
                },
                "contentAvailable": True,  # iOS silent notification
                "priority": "high",        # Android high priority for data delivery
                # No title/body → data-only notification
            }
            messages.append(message)

        # Send push notifications via Expo Push API
        with httpx.Client(timeout=15) as client:
            response = client.post(EXPO_PUSH_URL, json=messages)
            response.raise_for_status()
            
            # Check for any errors in the response
            result = response.json()
            if isinstance(result, dict) and result.get("errors"):
                log_with_context(
                    worker_logger, 
                    "error", 
                    f"Expo push API returned errors: {result.get('errors')}", 
                    user_id=user_id, 
                    job_id=job_id,
                    component="push_notifications"
                )
                return False
                
            log_with_context(
                worker_logger, 
                "info", 
                f"Successfully sent {len(messages)} push notifications", 
                user_id=user_id, 
                job_id=job_id,
                component="push_notifications",
                extra_fields={"asset_id": asset_id, "tokens_count": len(tokens)}
            )
            return True

    except Exception as e:
        if "timeout" in str(e).lower():
            log_with_context(
                worker_logger,
                "error",
                "Timeout while sending push notifications",
                user_id=user_id,
                job_id=job_id,
                component="push_notifications"
            )
        elif hasattr(e, 'status_code'):
            log_with_context(
                worker_logger,
                "error",
                f"HTTP error while sending push notifications: {getattr(e, 'status_code', 'unknown')} - {str(e)}",
                user_id=user_id,
                job_id=job_id,
                component="push_notifications"
            )
        else:
            log_with_context(
                worker_logger,
                "error",
                f"Error while sending push notifications: {str(e)}",
                user_id=user_id,
                job_id=job_id,
                component="push_notifications"
            )
        return False
