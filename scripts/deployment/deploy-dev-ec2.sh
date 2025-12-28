#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE DEVELOPMENT Environment (New EC2)..."
echo "================================================"

# Configuration
DEV_EC2_HOST="ec2-user@44.222.168.46"
PROD_EC2_HOST="ec2-user@44.220.45.57"
DEV_REPO_PATH="/home/ec2-user/aipm"

# 1. Switch to develop branch
echo "📌 Step 1: Switching to develop branch..."
git checkout develop 2>/dev/null || git checkout -b develop
git pull origin develop 2>/dev/null || echo "  No remote develop branch yet"

# 2. Sync Production Data to Development DynamoDB
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
  cat /tmp/prod-stories.json | jq -c '.Items[]' | while IFS= read -r item; do
    printf '%s\n' "$item" > /tmp/story-item.json
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
  cat /tmp/prod-tests.json | jq -c '.Items[]' | while IFS= read -r item; do
    printf '%s\n' "$item" > /tmp/test-item.json
    aws dynamodb put-item --table-name aipm-backend-dev-acceptance-tests --item file:///tmp/test-item.json --region us-east-1
  done
  echo "  ✅ Copied $TEST_COUNT tests"
fi

# 3. Deploy Backend to Development EC2
echo "📦 Step 3: Deploying Backend to Development EC2..."
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$DEV_EC2_HOST" "echo 'SSH OK'" 2>/dev/null | grep -q "SSH OK"; then
  echo "  ✅ SSH connection successful to development server"
  
  # Deploy backend to dev EC2
  ssh -o StrictHostKeyChecking=no "$DEV_EC2_HOST" << 'ENDSSH'
    cd /home/ec2-user/aipm
    echo "  📥 Pulling latest code..."
    git fetch origin
    git reset --hard origin/develop 2>/dev/null || git reset --hard origin/main
    git pull origin develop 2>/dev/null || git pull origin main
    
    echo "  📦 Installing dependencies..."
    npm install --silent
    
    echo "  🔄 Restarting backend service..."
    sudo systemctl restart aipm-dev-backend
    sleep 3
    
    if sudo systemctl is-active --quiet aipm-dev-backend; then
      echo "  ✅ Backend service restarted successfully"
    else
      echo "  ⚠️  Backend service failed to start"
      sudo journalctl -u aipm-dev-backend -n 5
    fi
ENDSSH
  
  # Verify backend is running
  sleep 2
  if curl -s -o /dev/null -w "%{http_code}" http://44.222.168.46/ | grep -q "200"; then
    echo "  ✅ Development backend health check passed"
  else
    echo "  ⚠️  Development backend health check failed"
  fi
else
  echo "  ❌ SSH connection failed to development server"
  exit 1
fi

# 4. Deploy Kiro API to Development EC2
echo "📦 Step 4: Deploying Kiro API to Development EC2..."
ssh -o StrictHostKeyChecking=no "$DEV_EC2_HOST" << 'ENDSSH'
  echo "  🔧 Setting up Kiro API service..."
  
  # Create Kiro API service if it doesn't exist
  if ! sudo systemctl list-unit-files | grep -q kiro-api-dev; then
    sudo tee /etc/systemd/system/kiro-api-dev.service > /dev/null << 'EOF'
[Unit]
Description=Kiro API Development Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
ExecStart=/usr/bin/node scripts/kiro-api-server-v4.js
Environment=NODE_ENV=development
Environment=PORT=8081
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable kiro-api-dev
  fi
  
  echo "  🔄 Restarting Kiro API service..."
  sudo systemctl restart kiro-api-dev
  sleep 3
  
  if sudo systemctl is-active --quiet kiro-api-dev; then
    echo "  ✅ Kiro API service started successfully"
  else
    echo "  ⚠️  Kiro API service failed to start"
    sudo journalctl -u kiro-api-dev -n 5
  fi
ENDSSH

# Verify Kiro API is running
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://44.222.168.46:8081/health | grep -q "200"; then
  echo "  ✅ Development Kiro API health check passed"
else
  echo "  ⚠️  Development Kiro API health check failed"
fi

# 5. Deploy Terminal Server to Development EC2
echo "📦 Step 5: Deploying Terminal Server to Development EC2..."
ssh -o StrictHostKeyChecking=no "$DEV_EC2_HOST" << 'ENDSSH'
  echo "  🔧 Setting up Terminal Server service..."
  
  # Create terminal server service if it doesn't exist
  if ! sudo systemctl list-unit-files | grep -q aipm-terminal-server-dev; then
    sudo tee /etc/systemd/system/aipm-terminal-server-dev.service > /dev/null << 'EOF'
[Unit]
Description=AIPM Terminal Server Development
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
ExecStart=/usr/bin/node scripts/terminal-server.js
Environment=NODE_ENV=development
Environment=PORT=8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable aipm-terminal-server-dev
  fi
  
  echo "  🔄 Restarting Terminal Server service..."
  sudo systemctl restart aipm-terminal-server-dev
  sleep 3
  
  if sudo systemctl is-active --quiet aipm-terminal-server-dev; then
    echo "  ✅ Terminal Server service started successfully"
  else
    echo "  ⚠️  Terminal Server service failed to start"
    sudo journalctl -u aipm-terminal-server-dev -n 5
  fi
ENDSSH

# Verify Terminal Server is running
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://44.222.168.46:8080/health | grep -q "200"; then
  echo "  ✅ Development Terminal Server health check passed"
else
  echo "  ⚠️  Development Terminal Server health check failed"
fi

# 6. Update Frontend Configuration
echo "📝 Step 6: Creating frontend config for development..."
cat > apps/frontend/public/config-dev.js << EOF
// Development Environment Configuration
window.CONFIG = {
    API_BASE_URL: 'http://44.222.168.46',
    apiEndpoint: 'http://44.222.168.46',
    EC2_TERMINAL_URL: 'ws://44.222.168.46:8080',
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

# 7. Deploy Frontend to S3
echo "📦 Step 7: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ \
  --region us-east-1 \
  --exclude "*.md" \
  --delete

# 8. Verify Complete Deployment
echo "✅ Step 8: Verifying complete deployment..."

# Test all endpoints
echo "  Testing backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://44.222.168.46/ || echo "000")
echo "  Testing Kiro API..."
KIRO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://44.222.168.46:8081/health || echo "000")
echo "  Testing Terminal Server..."
TERMINAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://44.222.168.46:8080/health || echo "000")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEVELOPMENT ENVIRONMENT DEPLOYED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Frontend:       http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
echo "  • Backend:        http://44.222.168.46 (Status: $BACKEND_STATUS)"
echo "  • Kiro API:       http://44.222.168.46:8081 (Status: $KIRO_STATUS)"
echo "  • Terminal:       http://44.222.168.46:8080 (Status: $TERMINAL_STATUS)"
echo "  • Stories:        aipm-backend-dev-stories ($STORY_COUNT from prod)"
echo "  • Tests:          aipm-backend-dev-acceptance-tests ($TEST_COUNT from prod)"
echo ""
echo "🧪 Test: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html"
echo ""

# Cleanup temp files
rm -f /tmp/prod-stories.json /tmp/prod-tests.json /tmp/story-item.json /tmp/test-item.json
