#!/bin/bash
set -e

echo "🐳 Rebuilding ECS Docker image with jq..."

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME="aipm-q-worker"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.q-worker -t $REPO_NAME:latest .

# Tag image
echo "🏷️  Tagging image..."
docker tag $REPO_NAME:latest $ECR_URI:latest

# Push to ECR
echo "📤 Pushing to ECR..."
docker push $ECR_URI:latest

echo "✅ Docker image rebuilt and pushed!"
echo "📝 New tasks will use the updated image with jq installed"
