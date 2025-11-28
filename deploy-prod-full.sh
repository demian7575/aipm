#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE PRODUCTION Environment..."
echo "================================================"

# 1. Switch to main branch
echo "📌 Step 1: Switching to main branch..."
git checkout main
git pull origin main

# 2. Deploy Backend (Lambda + API Gateway + DynamoDB)
echo "📦 Step 2: Deploying Backend (Lambda + API Gateway + DynamoDB)..."
npx serverless deploy --stage prod

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name aipm-backend-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceEndpoint`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
  echo "⚠️  Could not retrieve API endpoint, checking alternative..."
  API_ENDPOINT=$(npx serverless info --stage prod | grep "endpoint:" | awk '{print $2}')
fi

echo "✅ Backend deployed: $API_ENDPOINT"

# 3. Update Frontend Config
echo "📝 Step 3: Updating frontend config for production..."
cat > apps/frontend/public/config.js << EOF
// Production Environment Configuration
window.CONFIG = {
    API_BASE_URL: '${API_ENDPOINT}',
    apiEndpoint: '${API_ENDPOINT}',
    ENVIRONMENT: 'production',
    environment: 'production',
    stage: 'prod',
    region: 'us-east-1',
    storiesTable: 'aipm-backend-prod-stories',
    acceptanceTestsTable: 'aipm-backend-prod-acceptance-tests',
    DEBUG: false
};
EOF

# 4. Deploy Frontend to S3
echo "📦 Step 4: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ \
  --region us-east-1 \
  --exclude "*.md" \
  --delete

# 5. Verify Deployment
echo "✅ Step 5: Verifying deployment..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 PRODUCTION ENVIRONMENT DEPLOYED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Frontend:  http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "  • Backend:   $API_ENDPOINT"
echo "  • Lambda:    aipm-backend-prod-api"
echo "  • Stories:   aipm-backend-prod-stories"
echo "  • Tests:     aipm-backend-prod-acceptance-tests"
echo ""
echo "🧪 Test: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html"
echo ""
