#!/bin/bash
set -e

# Enable debug output for GitHub Actions
if [[ -n "$GITHUB_ACTIONS" ]]; then
    set -x
fi

ENV=$1
if [[ -z "$ENV" ]]; then
    echo "Usage: $0 <prod|dev>"
    echo "  prod - Deploy to production environment"
    echo "  dev  - Deploy to development environment"
    exit 1
fi

# Environment configuration
if [[ "$ENV" == "prod" ]]; then
    HOST="44.197.204.18"
    SERVICE="aipm-backend"
    FRONTEND_BUCKET="aipm-static-hosting-demo"
    API_URL="http://44.197.204.18"
    STORIES_TABLE="aipm-backend-prod-stories"
    TESTS_TABLE="aipm-backend-prod-acceptance-tests"
    PRS_TABLE="aipm-backend-prod-prs"
elif [[ "$ENV" == "dev" ]]; then
    HOST="44.222.168.46"
    SERVICE="aipm-backend"
    FRONTEND_BUCKET="aipm-dev-frontend-hosting"
    API_URL="http://44.222.168.46"
    STORIES_TABLE="aipm-backend-dev-stories"
    TESTS_TABLE="aipm-backend-dev-acceptance-tests"
    PRS_TABLE="aipm-backend-dev-prs"
else
    echo "❌ Invalid environment: $ENV"
    echo "Valid environments: prod, dev"
    exit 1
fi

echo "🚀 Deploying to $ENV environment..."
echo "📍 Host: $HOST"
echo "🪣 Frontend: $FRONTEND_BUCKET"

# Deploy backend
echo "📦 Deploying backend..."

# Check if we're in GitHub Actions environment
if [[ -n "$GITHUB_ACTIONS" ]]; then
    echo "🔧 GitHub Actions environment detected - using simplified deployment"
    
    # SSH key should already be configured by the workflow
    if [[ ! -f ~/.ssh/id_rsa ]]; then
        echo "❌ SSH key not found - should be configured by workflow"
        exit 1
    fi
    
    echo "✅ Using SSH key configured by workflow"
    
    # Get current branch for PR deployments
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$CURRENT_BRANCH" == "main" ]]; then
        TARGET_BRANCH="main"
    else
        TARGET_BRANCH="$CURRENT_BRANCH"
    fi
    
    echo "📍 Deploying branch: $TARGET_BRANCH"
    
    # Generate deployment metadata
    COMMIT_HASH=$(git rev-parse --short HEAD)
    DEPLOY_VERSION=$(date +"%Y%m%d-%H%M%S")
    
    # Extract PR number from branch name or GitHub environment
    PR_NUMBER=""
    if [[ -n "$GITHUB_HEAD_REF" ]]; then
        # GitHub Actions: extract from GITHUB_HEAD_REF
        # Branch format: feature-name-STORYID or pr-NUMBER-feature-name-STORYID
        if [[ "$GITHUB_HEAD_REF" =~ pr-([0-9]+)- ]]; then
            PR_NUMBER="${BASH_REMATCH[1]}"
        elif [[ "$GITHUB_HEAD_REF" =~ -([0-9]{10,})$ ]]; then
            # Story ID at end (13 digits), not PR number
            PR_NUMBER=""
        fi
    elif [[ "$TARGET_BRANCH" =~ ^pr-([0-9]+)- ]]; then
        # Local: branch starts with pr-NUMBER-
        PR_NUMBER="${BASH_REMATCH[1]}"
    fi
    
    # If no PR number found, leave empty
    if [[ -z "$PR_NUMBER" ]]; then
        PR_NUMBER="none"
    fi
    
    echo "🔄 Simplified deployment to $HOST..."
    
    # Simplified deployment: fetch and checkout the correct branch
    # Create deployment script on remote host
    cat > /tmp/deploy_commands.sh << 'EOF'
cd aipm
echo 'Fetching latest code...'
git fetch origin
if [ "$1" != "main" ]; then
    echo "Fetching PR branch: $1"
    git fetch origin $1:$1
fi
echo "Checking out branch: $1"
git checkout $1
git reset --hard origin/$1
echo "Code updated successfully to branch: $1"

# Install Git hooks to prevent committing broken code
if [ -f scripts/install-hooks.sh ]; then
    echo "Installing Git hooks..."
    bash scripts/install-hooks.sh
fi
EOF
    
    scp -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no /tmp/deploy_commands.sh ec2-user@$HOST:/tmp/
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST bash /tmp/deploy_commands.sh $TARGET_BRANCH 2>/dev/null || {
        echo "⚠️ Git operations had warnings, verifying success..."
        ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST 'cd aipm && git branch --show-current' > /tmp/current_branch 2>/dev/null
        cat /tmp/current_branch 2>/dev/null > /tmp/branch_name || echo "unknown" > /tmp/branch_name
        read CURRENT_BRANCH < /tmp/branch_name
        rm -f /tmp/current_branch /tmp/branch_name
        if [[ "$CURRENT_BRANCH" == "$TARGET_BRANCH" ]]; then
            echo "✅ Git operations completed successfully - on branch: $CURRENT_BRANCH"
        else
            echo "❌ Git operations failed - expected: $TARGET_BRANCH, actual: $CURRENT_BRANCH"
            exit 1
        fi
    }
    
    # Update version in code
    echo "⚙️ Updating deployment version..."
    VERSION_STRING="${DEPLOY_VERSION}-${COMMIT_HASH}"
    
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST "cd aipm && sed -i 's/DEPLOYMENT_VERSION_PLACEHOLDER/$VERSION_STRING/g' apps/backend/app.js"
    echo "✅ Updated version to: $VERSION_STRING"
    
    # Restart services
    echo "🔄 Restarting services..."
    SERVICE_NAME="aipm-${ENV}-backend.service"
    if [[ "$ENV" == "prod" ]]; then
        SERVICE_NAME="aipm-backend.service"
    fi
    
    # Update systemd service file with environment variables
    cat > /tmp/update_service.sh << EOF
cd aipm

# Update service file with current deployment info
sudo sed -i '/^Environment=DEPLOY_VERSION=/d' /etc/systemd/system/$SERVICE_NAME
sudo sed -i '/^Environment=COMMIT_HASH=/d' /etc/systemd/system/$SERVICE_NAME
sudo sed -i '/^Environment=PR_NUMBER=/d' /etc/systemd/system/$SERVICE_NAME
sudo sed -i '/^\[Service\]/a Environment=DEPLOY_VERSION=$DEPLOY_VERSION' /etc/systemd/system/$SERVICE_NAME
sudo sed -i '/^\[Service\]/a Environment=COMMIT_HASH=$COMMIT_HASH' /etc/systemd/system/$SERVICE_NAME
sudo sed -i '/^\[Service\]/a Environment=PR_NUMBER=$PR_NUMBER' /etc/systemd/system/$SERVICE_NAME

sudo systemctl daemon-reload
EOF
    
    cat > /tmp/restart_services.sh << 'EOF'
cd aipm

# Check for force restart flag
FORCE_RESTART="${FORCE_RESTART_SESSION_POOL:-false}"

# Check which files changed
echo 'Checking for Session Pool changes...'
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "all")

# Session Pool related files
SESSION_POOL_FILES=(
  "scripts/kiro-session-pool.js"
  "scripts/semantic-api-server-v2.js"
  "scripts/queue-cleanup.js"
  "config/kiro-session-pool.service"
  "config/semantic-api-server.service"
  "config/queue-cleanup.service"
  "scripts/systemd/kiro-session-pool.service"
  "scripts/systemd/aipm-semantic-api.service"
)

# Check if Session Pool needs restart
NEEDS_SESSION_POOL_RESTART=false

if [ "$FORCE_RESTART" = "true" ]; then
  echo "🔄 Force restart flag enabled"
  NEEDS_SESSION_POOL_RESTART=true
elif [ "$CHANGED_FILES" = "all" ]; then
  echo "⚠️  Cannot determine changes - will restart all services"
  NEEDS_SESSION_POOL_RESTART=true
else
  for file in "${SESSION_POOL_FILES[@]}"; do
    if echo "$CHANGED_FILES" | grep -q "^$file"; then
      echo "📝 Session Pool change detected: $file"
      NEEDS_SESSION_POOL_RESTART=true
      break
    fi
  done
fi

echo 'Stopping backend services...'
sudo systemctl stop $SERVICE_NAME || true
sudo systemctl stop aipm-kiro-api || true

if [ "$NEEDS_SESSION_POOL_RESTART" = "true" ]; then
  echo '🔄 Stopping Session Pool services (changes detected)...'
  sudo systemctl stop kiro-session-pool || true
  sudo systemctl stop aipm-kiro-cli || true
  sudo systemctl stop aipm-semantic-api || true
  sudo systemctl stop queue-cleanup || true
else
  echo '✅ Session Pool unchanged - keeping services running'
fi

echo 'Force killing backend Node.js processes...'
sudo pkill -9 -f 'node.*apps/backend' || true
sleep 2

echo 'Installing/updating service files...'
sudo cp scripts/systemd/aipm-kiro-api.service /etc/systemd/system/
sudo cp scripts/systemd/aipm-kiro-cli.service /etc/systemd/system/
sudo cp scripts/systemd/kiro-session-pool.service /etc/systemd/system/
sudo cp scripts/systemd/aipm-semantic-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable aipm-kiro-api aipm-kiro-cli kiro-session-pool aipm-semantic-api

echo 'Starting backend services...'
sudo systemctl start $SERVICE_NAME
sudo systemctl start aipm-kiro-api

if [ "$NEEDS_SESSION_POOL_RESTART" = "true" ]; then
  echo '🔄 Restarting Session Pool services...'
  sudo systemctl start kiro-session-pool
  sudo systemctl start aipm-kiro-cli
  sudo systemctl start aipm-semantic-api
  sudo systemctl start queue-cleanup || true
  
  echo 'Waiting for Session Pool to be ready...'
  sleep 5
  
  # Health check
  if curl -s http://localhost:8082/health | grep -q "healthy"; then
    echo '✅ Session Pool is healthy'
  else
    echo '⚠️  Session Pool health check failed'
  fi
else
  echo '✅ Session Pool services kept running'
  curl -s http://localhost:8082/health | jq '.' || echo 'Session Pool status check skipped'
fi

echo 'Waiting for services to start...'
sleep 3
sudo systemctl status $SERVICE_NAME --no-pager || true
echo 'Service restart completed'
EOF
    scp -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no /tmp/update_service.sh ec2-user@$HOST:/tmp/
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST bash /tmp/update_service.sh
    
    scp -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no /tmp/restart_services.sh ec2-user@$HOST:/tmp/
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST "SERVICE_NAME=$SERVICE_NAME FORCE_RESTART_SESSION_POOL=${FORCE_RESTART_SESSION_POOL:-false} bash /tmp/restart_services.sh"
    
    echo "✅ Backend deployed successfully"
fi

# Note: Frontend deployment is handled separately by the workflow
echo "ℹ️  Frontend deployment will be handled by the workflow"

# Verify deployment
echo "🔍 Verifying deployment..."
sleep 5

# Test backend health
if curl -s --connect-timeout 10 "$API_URL/api/version" | grep -q "version"; then
    echo "✅ Backend is responding"
else
    echo "⚠️ Backend health check failed (may still be starting)"
fi

# Test frontend
if [[ "$ENV" == "prod" ]]; then
    FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
else
    FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"
fi

if curl -s --connect-timeout 10 "$FRONTEND_URL" | grep -q "html"; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️ Frontend health check failed"
fi

echo "🎉 Deployment to $ENV completed successfully!"
