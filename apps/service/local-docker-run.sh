#!/bin/bash

# Build and run athli-service locally
set -e

# Stop any existing container using port 3003
echo "Stopping any existing containers on port 3003..."
docker ps -q --filter "publish=3003" | xargs -r docker stop 2>/dev/null || true

echo "Building athli-service..."
docker build -t athli-service .

echo "Running athli-service on http://localhost:3003"
docker run --rm -p 3003:3003 --env-file .env -e NODE_ENV=production -e PORT=3003 athli-service
