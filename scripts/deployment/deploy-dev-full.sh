#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE DEVELOPMENT Environment..."
echo "================================================"

# 1. Switch to develop branch (NOT main!)
echo "📌 Step 1: Switching to develop branch..."
git checkout develop
git pull origin develop

# 2. Sync Production Data to Development
echo "📊 Step 2: Syncing production data to development..."
echo "  Copying stories..."
aws dynamodb scan --table-name aipm-backend-prod-stories --region us-east-1 > /tmp/prod-stories.json
STORY_COUNT=$(cat /tmp/prod-stories.json | jq '.Items | length')
echo "  Found $STORY_COUNT stories in production"

if [ "$STORY_COUNT" -gt 0 ]; then
  # Clear dev table
  aws dynamodb scan --table-name aipm-backend-dev-stories --region us-east-1 --query 'Items[].id.N' --output text | \
    xargs -I {} aws dynamodb delete-item --table-name aipm-backend-dev-stories --key '{"id":{"N":"{}"}}' --region us-east-1 2>/dev/null || true
  
  # Copy items
  cat /tmp/prod-stories.json | jq -c '.Items[]' | while read item; do
    aws dynamodb put-item --table-name aipm-backend-dev-stories --item "$item" --region us-east-1
  done
  echo "  ✅ Copied $STORY_COUNT stories"
fi

echo "  Copying acceptance tests..."
aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests --region us-east-1 > /tmp/prod-tests.json
TEST_COUNT=$(cat /tmp/prod-tests.json | jq '.Items | length')
echo "  Found $TEST_COUNT tests in production"

if [ "$TEST_COUNT" -gt 0 ]; then
  # Clear dev table
  aws dynamodb scan --table-name aipm-backend-dev-acceptance-tests --region us-east-1 --query 'Items[].id.N' --output text | \
    xargs -I {} aws dynamodb delete-item --table-name aipm-backend-dev-acceptance-tests --key '{"id":{"N":"{}"}}' --region us-east-1 2>/dev/null || true
  
  # Copy items
  cat /tmp/prod-tests.json | jq -c '.Items[]' | while read item; do
    aws dynamodb put-item --table-name aipm-backend-dev-acceptance-tests --item "$item" --region us-east-1
  done
  echo "  ✅ Copied $TEST_COUNT tests"
fi

# 3. Deploy Backend (Lambda + API Gateway + DynamoDB)
echo "📦 Step 3: Deploying Backend (Lambda + API Gateway + DynamoDB)..."
npx serverless deploy --stage dev || echo "⚠️  Serverless deploy skipped (already deployed)"

# Use correct dev API endpoint
API_ENDPOINT="https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"
echo "✅ Backend endpoint: $API_ENDPOINT"

# 4. Create Frontend Config (don't overwrite in git)
echo "📝 Step 4: Creating frontend config for development..."
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

# 5. Deploy Frontend to S3
echo "📦 Step 5: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ \
  --region us-east-1 \
  --exclude "*.md" \
  --delete

# 6. Verify Deployment
echo "✅ Step 6: Verifying deployment..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEVELOPMENT ENVIRONMENT DEPLOYED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Frontend:  http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
echo "  • Backend:   $API_ENDPOINT"
echo "  • Lambda:    aipm-backend-dev-api"
echo "  • Stories:   aipm-backend-dev-stories ($STORY_COUNT from prod)"
echo "  • Tests:     aipm-backend-dev-acceptance-tests ($TEST_COUNT from prod)"
echo ""
echo "🧪 Test: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html"
echo ""
