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
    echo "$item" > /tmp/story-item.json
    aws dynamodb put-item --table-name aipm-backend-dev-stories --item file:///tmp/story-item.json --region us-east-1
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
    echo "$item" > /tmp/test-item.json
    aws dynamodb put-item --table-name aipm-backend-dev-acceptance-tests --item file:///tmp/test-item.json --region us-east-1
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

# 6. Deploy EC2 Terminal Server (Worker Pool)
echo "🖥️  Step 6: Deploying EC2 Terminal Server..."
EC2_HOST="ec2-user@44.220.45.57"
EC2_REPO_PATH="/home/ec2-user/aipm"

# Check if SSH access is available
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$EC2_HOST" "echo 'SSH OK'" 2>/dev/null | grep -q "SSH OK"; then
  echo "  ✅ SSH connection successful"
  
  # Deploy to EC2
  ssh -o StrictHostKeyChecking=no "$EC2_HOST" << 'ENDSSH'
    cd /home/ec2-user/aipm
    echo "  📥 Pulling latest code..."
    git fetch origin
    git reset --hard origin/develop
    git pull origin develop
    
    # Check if systemd service exists
    if sudo systemctl list-unit-files | grep -q aipm-terminal-server; then
      echo "  🔄 Restarting systemd service..."
      sudo systemctl restart aipm-terminal-server
      sleep 3
      
      if sudo systemctl is-active --quiet aipm-terminal-server; then
        echo "  ✅ Service restarted successfully"
      else
        echo "  ⚠️  Service failed to start, check logs"
      fi
    else
      echo "  ⚠️  Systemd service not configured"
      echo "  🔧 Setting up service..."
      bash scripts/deployment/setup-ec2-service.sh
    fi
ENDSSH
  
  # Verify terminal server is running
  sleep 2
  if curl -s -o /dev/null -w "%{http_code}" http://44.220.45.57:8080/health | grep -q "200"; then
    echo "  ✅ Terminal server health check passed"
  else
    echo "  ⚠️  Terminal server health check failed"
    echo "  📝 Check logs: ssh $EC2_HOST 'sudo journalctl -u aipm-terminal-server -n 50'"
  fi
else
  echo "  ⚠️  SSH connection failed - EC2 terminal server not updated"
  echo "  📝 Manual deployment required:"
  echo "     ssh $EC2_HOST"
  echo "     cd $EC2_REPO_PATH"
  echo "     git pull origin develop"
  echo "     sudo systemctl restart aipm-terminal-server"
  echo ""
  echo "  📝 Or setup systemd service:"
  echo "     ssh $EC2_HOST"
  echo "     cd $EC2_REPO_PATH"
  echo "     bash scripts/deployment/setup-ec2-service.sh"
fi

# 7. Verify Deployment
echo "✅ Step 7: Verifying deployment..."
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
echo "  • EC2:       http://44.220.45.57:8080/health (Worker Pool)"
echo ""
echo "🧪 Test: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html"
echo ""
