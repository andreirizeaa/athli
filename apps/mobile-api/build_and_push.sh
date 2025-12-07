#!/bin/bash

# FormAI Service - Docker Build and Push Script
# This script builds the Docker image for linux/amd64 platform and pushes it to Docker Hub

set -e  # Exit on any error

echo "🚀 Starting FormAI Service Docker build and push process..."

# Configuration
IMAGE_NAME="formai-service"
DOCKER_HUB_REPO="andreirizeaa/formai-service"
TAG="latest"
PLATFORM="linux/amd64"

echo "📦 Building Docker image for platform: $PLATFORM"
docker build --platform $PLATFORM -t $IMAGE_NAME:$TAG .

echo "🏷️  Tagging image as $DOCKER_HUB_REPO:$TAG"
docker tag $IMAGE_NAME:$TAG $DOCKER_HUB_REPO:$TAG

echo "📤 Pushing image to Docker Hub..."
docker push $DOCKER_HUB_REPO:$TAG

echo "✅ Successfully built and pushed $DOCKER_HUB_REPO:$TAG"
echo "🎉 Deployment ready!"



