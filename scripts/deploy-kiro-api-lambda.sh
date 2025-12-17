#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying Kiro API Lambda (${ENVIRONMENT})"
echo "=============================================="

cd /repo/ebaejun/tools/aws/aipm

# Install AWS SDK dependencies
echo "📦 Installing dependencies..."
npm install --save @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

# Package Lambda functions
echo "📦 Packaging Lambda functions..."
mkdir -p .aws-sam/build
cp lambda-handler.js .aws-sam/build/
cp queue-processor.js .aws-sam/build/
cp -r node_modules .aws-sam/build/ 2>/dev/null || true

# Deploy with SAM
echo "☁️  Deploying with SAM..."
sam deploy \
  --template-file infrastructure/kiro-api-lambda.yml \
  --stack-name kiro-api-lambda-${ENVIRONMENT} \
  --parameter-overrides Environment=${ENVIRONMENT} \
  --capabilities CAPABILITY_IAM \
  --region ${REGION} \
  --resolve-s3 \
  --no-confirm-changeset

# Get endpoint URL
echo "🔗 Getting endpoint URL..."
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name kiro-api-lambda-${ENVIRONMENT} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`KiroAPIEndpoint`].OutputValue' \
  --output text)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 KIRO API LAMBDA DEPLOYED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Endpoint:  ${ENDPOINT}"
echo "  • Health:    ${ENDPOINT}/health"
echo "  • Stack:     kiro-api-lambda-${ENVIRONMENT}"
echo ""
echo "🧪 Test endpoint:"
echo "  curl ${ENDPOINT}/health"
echo ""

# Update frontend configuration
echo "⚙️  Updating frontend configuration..."
CONFIG_FILE="apps/frontend/public/config-${ENVIRONMENT}.js"

if [ -f "${CONFIG_FILE}" ]; then
  if grep -q "KIRO_API_URL" "${CONFIG_FILE}"; then
    sed -i.bak "s|KIRO_API_URL:.*|KIRO_API_URL: '${ENDPOINT}',|" "${CONFIG_FILE}"
  else
    sed -i.bak "/};/i\\    KIRO_API_URL: '${ENDPOINT}'," "${CONFIG_FILE}"
  fi
  echo "✅ Updated ${CONFIG_FILE}"
fi

echo ""
echo "✅ Deployment completed!"
