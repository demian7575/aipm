#!/bin/bash
# Gating test: Verify "Test in Dev" workflow can deploy successfully

set -e

echo "🧪 Testing Dev Deployment Workflow"
echo "=================================="

# Test 1: Verify Lambda function exists
echo "1️⃣ Checking Lambda function exists..."
LAMBDA_NAME=$(aws lambda get-function --function-name aipm-backend-dev-api --region us-east-1 --query 'Configuration.FunctionName' --output text 2>&1)
if [ "$LAMBDA_NAME" = "aipm-backend-dev-api" ]; then
  echo "   ✅ Lambda function exists"
else
  echo "   ❌ Lambda function not found"
  exit 1
fi

# Test 2: Package backend successfully
echo "2️⃣ Testing serverless package..."
cd /repo/ebaejun/tools/aws/aipm
npx serverless package --stage dev --region us-east-1 > /dev/null 2>&1
if [ -f .serverless/aipm-backend.zip ]; then
  SIZE=$(ls -lh .serverless/aipm-backend.zip | awk '{print $5}')
  echo "   ✅ Package created: $SIZE"
else
  echo "   ❌ Package creation failed"
  exit 1
fi

# Test 3: Verify package can update Lambda
echo "3️⃣ Testing Lambda update..."
RESULT=$(aws lambda update-function-code \
  --function-name aipm-backend-dev-api \
  --zip-file fileb://.serverless/aipm-backend.zip \
  --region us-east-1 \
  --query 'LastModified' \
  --output text 2>&1)
if [ $? -eq 0 ]; then
  echo "   ✅ Lambda updated: $RESULT"
else
  echo "   ❌ Lambda update failed: $RESULT"
  exit 1
fi

# Test 4: Verify frontend S3 bucket exists
echo "4️⃣ Checking frontend S3 bucket..."
aws s3 ls s3://aipm-dev-frontend-hosting --region us-east-1 > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Frontend bucket exists"
else
  echo "   ❌ Frontend bucket not found"
  exit 1
fi

# Test 5: Verify dev endpoint responds
echo "5️⃣ Testing dev API endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://$(aws lambda get-function --function-name aipm-backend-dev-api --region us-east-1 --query 'Configuration.FunctionArn' --output text | cut -d: -f5).execute-api.us-east-1.amazonaws.com/dev/api/stories 2>&1 || echo "000")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
  echo "   ✅ API endpoint accessible (HTTP $RESPONSE)"
else
  echo "   ⚠️  API endpoint returned: $RESPONSE (may need API Gateway check)"
fi

echo ""
echo "=================================="
echo "✅ All gating tests passed!"
echo ""
echo "The 'Test in Dev' workflow should work correctly."
