#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE PRODUCTION Environment..."
echo "================================================"

# 0. Validate build before deployment
echo "🔍 Step 0: Validating build..."
node scripts/validate-build.js

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

if [ -z "$API_ENDPOINT" ]; then
  echo "⚠️  Using known prod API endpoint..."
  API_ENDPOINT="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"
fi

echo "✅ Backend deployed: $API_ENDPOINT"

# 3. Generate Frontend Config
echo "📝 Step 3: Generating frontend config for production..."
./scripts/deployment/generate-config.sh prod

# Copy to config.js for deployment
cp apps/frontend/public/config-prod.js apps/frontend/public/config.js

# 4. Deploy Frontend to S3
echo "📦 Step 4: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ \
  --region us-east-1 \
  --exclude "*.md" \
  --cache-control "no-cache, must-revalidate" \
  --delete

# 5. Verify Deployment
# 5. Deploy EC2 Services (Terminal Server + Kiro API)
echo "🖥️  Step 5: Deploying EC2 Services..."
EC2_HOST="ec2-user@44.220.45.57"
EC2_REPO_PATH="/home/ec2-user/aipm"

# Check if SSH access is available
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$EC2_HOST" "echo 'SSH OK'" 2>/dev/null | grep -q "SSH OK"; then
  echo "  ✅ SSH connection successful"
  
  # Deploy to EC2
  ssh -o StrictHostKeyChecking=no "$EC2_HOST" << 'ENDSSH'
    cd /home/ec2-user/aipm
    echo "  📥 Pulling latest code from main..."
    git fetch origin
    git reset --hard origin/main
    git pull origin main
    
    # Deploy Terminal Server
    if sudo systemctl list-unit-files | grep -q aipm-terminal-server; then
      echo "  🔄 Restarting terminal server..."
      sudo systemctl restart aipm-terminal-server
      sleep 2
      
      if sudo systemctl is-active --quiet aipm-terminal-server; then
        echo "  ✅ Terminal server restarted"
      else
        echo "  ⚠️  Terminal server failed to start"
      fi
    else
      echo "  ⚠️  Terminal server not configured"
    fi
    
    # Deploy Kiro API Server
    if sudo systemctl list-unit-files | grep -q kiro-api-server; then
      echo "  🔄 Restarting Kiro API server..."
      sudo systemctl restart kiro-api-server
      sleep 2
      
      if sudo systemctl is-active --quiet kiro-api-server; then
        echo "  ✅ Kiro API server restarted"
      else
        echo "  ⚠️  Kiro API server failed to start"
      fi
    else
      echo "  🔧 Setting up Kiro API server..."
      bash scripts/deployment/setup-kiro-api-service.sh
    fi
ENDSSH
  
  # Verify services
  sleep 2
  echo "  🔍 Verifying services..."
  
  if curl -s -o /dev/null -w "%{http_code}" http://44.220.45.57:8080/health | grep -q "200"; then
    echo "  ✅ Terminal server health check passed"
  else
    echo "  ⚠️  Terminal server health check failed"
  fi
  
  if curl -s -o /dev/null -w "%{http_code}" http://44.220.45.57:8081/health | grep -q "200"; then
    echo "  ✅ Kiro API health check passed"
  else
    echo "  ⚠️  Kiro API health check failed"
  fi
else
  echo "  ⚠️  SSH connection failed - EC2 services not updated"
  echo "  📝 Manual deployment required:"
  echo "     ssh $EC2_HOST"
  echo "     cd $EC2_REPO_PATH"
  echo "     git pull origin main"
  echo "     sudo systemctl restart aipm-terminal-server"
  echo "     sudo systemctl restart kiro-api-server"
fi

# 6. Verify Deployment
echo "✅ Step 6: Verifying deployment..."
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
echo "  • Terminal:  http://44.220.45.57:8080/health (Worker Pool)"
echo "  • Kiro API:  http://44.220.45.57:8081/health (Code Generation)"
echo ""
echo "🧪 Test: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html"
echo ""
