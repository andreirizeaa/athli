import os

# Broker and Backend Configuration
broker_url = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://redis:6379/0"))
result_backend = os.environ.get("CELERY_RESULT_BACKEND", broker_url)

# Task acknowledgment and reliability
task_acks_late = True
worker_prefetch_multiplier = int(os.environ.get("CELERY_WORKER_PREFETCH_MULTIPLIER", "1"))

# Broker transport options
broker_transport_options = {
    "visibility_timeout": int(os.environ.get("CELERY_VISIBILITY_TIMEOUT", "7200"))  # > max job runtime
}

# Task time limits
task_soft_time_limit = int(os.environ.get("CELERY_SOFT_LIMIT", "900"))  # 15 minutes
task_time_limit = int(os.environ.get("CELERY_HARD_LIMIT", "1200"))  # 20 minutes
worker_max_tasks_per_child = int(os.environ.get("CELERY_MAX_TASKS_PER_CHILD", "50"))

# Retry configuration
task_default_retry_delay = int(os.environ.get("CELERY_RETRY_DELAY", "10"))
task_annotations = {"*": {"max_retries": int(os.environ.get("CELERY_MAX_RETRIES", "3"))}}

# Queue routing - CPU vs I/O separation
task_routes = {
    "tasks.pose_stage": {"queue": "pose"},
    "tasks.analyze_stage": {"queue": "analyze"},
    # Fallback for any unrouted tasks
    "tasks.*": {"queue": "default"},
}

# Result configuration
task_ignore_result = os.environ.get("CELERY_TASK_IGNORE_RESULT", "True").lower() == "true"
result_persistent = os.environ.get("CELERY_RESULT_PERSISTENT", "False").lower() == "true"
result_expires = int(os.environ.get("CELERY_RESULT_EXPIRES", "3600"))

# Worker configuration
worker_hijack_root_logger = os.environ.get("CELERY_WORKER_HIJACK_ROOT_LOGGER", "False").lower() == "true"

# Optimization settings
task_compression = os.environ.get("CELERY_TASK_COMPRESSION", "gzip")
result_compression = os.environ.get("CELERY_RESULT_COMPRESSION", "gzip")

# Security
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]