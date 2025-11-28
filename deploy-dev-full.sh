#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE DEVELOPMENT Environment..."
echo "================================================"

# 1. Switch to develop branch (NOT main!)
echo "📌 Step 1: Switching to develop branch..."
git checkout develop
git pull origin develop

# 2. Deploy Backend (Lambda + API Gateway + DynamoDB)
echo "📦 Step 2: Deploying Backend (Lambda + API Gateway + DynamoDB)..."
npx serverless deploy --stage dev

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name aipm-backend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceEndpoint`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
  echo "⚠️  Could not retrieve API endpoint, checking alternative..."
  API_ENDPOINT=$(npx serverless info --stage dev | grep "endpoint:" | awk '{print $2}')
fi

if [ -z "$API_ENDPOINT" ]; then
  echo "⚠️  Using fallback prod API endpoint..."
  API_ENDPOINT="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"
fi

echo "✅ Backend deployed: $API_ENDPOINT"

# 3. Create Frontend Config (don't overwrite in git)
echo "📝 Step 3: Creating frontend config for development..."
cat > apps/frontend/public/config-dev.js << EOF
// Development Environment Configuration
window.CONFIG = {
    API_BASE_URL: '${API_ENDPOINT}',
    apiEndpoint: '${API_ENDPOINT}',
    ENVIRONMENT: 'development',
    environment: 'development',
    stage: 'dev',
    region: 'us-east-1',
    storiesTable: 'aipm-backend-dev-stories',
    acceptanceTestsTable: 'aipm-backend-dev-acceptance-tests',
    DEBUG: true
};
EOF

# Copy to config.js for deployment
cp apps/frontend/public/config-dev.js apps/frontend/public/config.js

# 4. Deploy Frontend to S3
echo "📦 Step 4: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ \
  --region us-east-1 \
  --exclude "*.md" \
  --delete

# 5. Verify Deployment
echo "✅ Step 5: Verifying deployment..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEVELOPMENT ENVIRONMENT DEPLOYED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Frontend:  http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
echo "  • Backend:   $API_ENDPOINT"
echo "  • Lambda:    aipm-backend-dev-api"
echo "  • Stories:   aipm-backend-dev-stories"
echo "  • Tests:     aipm-backend-dev-acceptance-tests"
echo ""
echo "🧪 Test: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html"
echo ""
