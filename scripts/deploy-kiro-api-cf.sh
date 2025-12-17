#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying Kiro API with CloudFormation (${ENVIRONMENT})"
echo "========================================================="

cd /repo/ebaejun/tools/aws/aipm

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf .deploy
mkdir -p .deploy

# Copy Lambda code
cp lambda-handler.js .deploy/
cp queue-processor.js .deploy/
cp package*.json .deploy/

# Install production dependencies
cd .deploy
npm install --production --save @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
cd ..

# Create ZIP file
echo "📦 Creating ZIP package..."
cd .deploy
zip -r ../kiro-api-lambda.zip . -q
cd ..

# Upload to S3
echo "☁️  Uploading to S3..."
BUCKET_NAME="aipm-deployments-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://${BUCKET_NAME} 2>/dev/null || true
aws s3 cp kiro-api-lambda.zip s3://${BUCKET_NAME}/kiro-api-lambda-${ENVIRONMENT}.zip

# Deploy CloudFormation stack
echo "☁️  Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file infrastructure/kiro-api-cf.yml \
  --stack-name kiro-api-${ENVIRONMENT} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    S3Bucket=${BUCKET_NAME} \
    S3Key=kiro-api-lambda-${ENVIRONMENT}.zip \
  --capabilities CAPABILITY_IAM \
  --region ${REGION}

# Get endpoint URL
echo "🔗 Getting endpoint URL..."
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name kiro-api-${ENVIRONMENT} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`KiroAPIEndpoint`].OutputValue' \
  --output text)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 KIRO API DEPLOYED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Endpoint:  ${ENDPOINT}"
echo "  • Health:    ${ENDPOINT}/health"
echo "  • Stack:     kiro-api-${ENVIRONMENT}"
echo ""
echo "🧪 Test endpoint:"
echo "  curl ${ENDPOINT}/health"
echo ""

# Update frontend configuration
echo "⚙️  Updating frontend configuration..."
CONFIG_FILE="apps/frontend/public/config.js"

if [ -f "${CONFIG_FILE}" ]; then
  if grep -q "KIRO_API_URL" "${CONFIG_FILE}"; then
    sed -i.bak "s|KIRO_API_URL:.*|KIRO_API_URL: '${ENDPOINT}',|" "${CONFIG_FILE}"
  else
    sed -i.bak "/};/i\\    KIRO_API_URL: '${ENDPOINT}'," "${CONFIG_FILE}"
  fi
  echo "✅ Updated ${CONFIG_FILE}"
fi

# Cleanup
rm -rf .deploy kiro-api-lambda.zip

echo ""
echo "✅ Deployment completed!"
