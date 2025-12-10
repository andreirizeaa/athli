#!/bin/bash

# FormAI API Server Startup Script with Maximum Concurrency
# This script optimizes the FastAPI server for maximum concurrent requests

# Set environment variables for maximum concurrency
export GUNICORN_WORKERS=${GUNICORN_WORKERS:-$(nproc)}
export WORKER_CONNECTIONS=1000
export MAX_REQUESTS=10000
export MAX_REQUESTS_JITTER=1000

# Performance optimizations
export PYTHONUNBUFFERED=1
export PYTHONDONTWRITEBYTECODE=1

# Memory optimizations
export MALLOC_ARENA_MAX=2

# Network optimizations
export TCP_KEEPALIVE=1
export TCP_KEEPIDLE=600
export TCP_KEEPINTVL=60
export TCP_KEEPCNT=3

echo "Starting FormAI API Server with maximum concurrency..."
echo "Workers: $GUNICORN_WORKERS"
echo "Worker Connections: $WORKER_CONNECTIONS"
echo "Max Requests per Worker: $MAX_REQUESTS"

# Start the server with Gunicorn for maximum concurrency
exec gunicorn -c gunicorn.conf.py main:app
