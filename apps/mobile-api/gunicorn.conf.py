# Gunicorn configuration for maximum concurrency
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = int(os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 10000
max_requests_jitter = 1000
preload_app = True

# Timeouts
timeout = 120
keepalive = 30
graceful_timeout = 30

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "formai-api"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

# Worker lifecycle
worker_tmp_dir = "/dev/shm"  # Use shared memory for better performance

# Performance tuning
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# Memory management
max_requests = 10000  # Restart workers after 10k requests
max_requests_jitter = 1000  # Add randomness to prevent thundering herd

# Preload application for better memory usage
preload_app = True

# Enable worker recycling
max_worker_connections = 1000

# Additional Uvicorn worker settings
def when_ready(server):
    server.log.info("FormAI API server is ready to accept connections")

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_worker_init(worker):
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

def worker_abort(worker):
    worker.log.info("Worker received SIGABRT signal")
