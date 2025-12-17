#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="kiro-api"
IMAGE_TAG="latest"

echo "🚀 Deploying Kiro API to AWS ECS (${ENVIRONMENT})"
echo "================================================"

# Step 1: Create ECR repository if it doesn't exist
echo "📦 Step 1: Setting up ECR repository..."
aws ecr describe-repositories --repository-names ${ECR_REPO} --region ${REGION} 2>/dev/null || \
aws ecr create-repository --repository-name ${ECR_REPO} --region ${REGION}

# Step 2: Build and push Docker image
echo "🐳 Step 2: Building and pushing Docker image..."
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"

# Login to ECR
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Build image
docker build -f Dockerfile.kiro-api -t ${ECR_REPO}:${IMAGE_TAG} .

# Tag and push
docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}
docker push ${ECR_URI}

echo "✅ Image pushed: ${ECR_URI}"

# Step 3: Deploy CloudFormation stack
echo "☁️  Step 3: Deploying CloudFormation stack..."
STACK_NAME="kiro-api-${ENVIRONMENT}"

aws cloudformation deploy \
  --template-file infrastructure/kiro-api-ecs.yml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides Environment=${ENVIRONMENT} \
  --capabilities CAPABILITY_IAM \
  --region ${REGION}

# Step 4: Get endpoint URL
echo "🔗 Step 4: Getting endpoint URL..."
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

KIRO_API_URL="http://${ALB_DNS}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 KIRO API DEPLOYED SUCCESSFULLY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Endpoint:  ${KIRO_API_URL}"
echo "  • Health:    ${KIRO_API_URL}/health"
echo "  • ECR Image: ${ECR_URI}"
echo "  • Stack:     ${STACK_NAME}"
echo ""
echo "🧪 Test endpoint:"
echo "  curl ${KIRO_API_URL}/health"
echo ""

# Step 5: Update frontend configuration
echo "⚙️  Step 5: Updating frontend configuration..."
CONFIG_FILE="apps/frontend/public/config-${ENVIRONMENT}.js"

if [ -f "${CONFIG_FILE}" ]; then
  # Add Kiro API URL to existing config
  if grep -q "KIRO_API_URL" "${CONFIG_FILE}"; then
    sed -i.bak "s|KIRO_API_URL:.*|KIRO_API_URL: '${KIRO_API_URL}',|" "${CONFIG_FILE}"
  else
    sed -i.bak "/};/i\\    KIRO_API_URL: '${KIRO_API_URL}'," "${CONFIG_FILE}"
  fi
  echo "✅ Updated ${CONFIG_FILE}"
else
  echo "⚠️  Config file ${CONFIG_FILE} not found"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "   Kiro API is now running on AWS ECS Fargate"
