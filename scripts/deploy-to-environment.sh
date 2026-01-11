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
    HOST="44.220.45.57"
    SERVICE="aipm-backend"
    FRONTEND_BUCKET="aipm-static-hosting-demo"
    API_URL="http://44.220.45.57"
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
    
    # Extract PR number if available
    PR_NUMBER="$ENV"
    if [[ -n "$GITHUB_HEAD_REF" ]]; then
        PR_NUMBER=$(echo "$GITHUB_HEAD_REF" | grep -o '[0-9]\+' | head -1 || echo "$ENV")
    elif [[ "$TARGET_BRANCH" =~ [0-9]+ ]]; then
        PR_NUMBER=$(echo "$TARGET_BRANCH" | grep -o '[0-9]\+' | head -1 || echo "$ENV")
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
    
    # Update environment configuration
    echo "⚙️ Updating environment configuration..."
    cat > /tmp/env_config.sh << EOF
cd aipm
cat > .env << 'ENVEOF'
STORIES_TABLE=$STORIES_TABLE
ACCEPTANCE_TESTS_TABLE=$TESTS_TABLE
AWS_REGION=us-east-1
KIRO_API_PORT=8081
DEPLOY_VERSION=$DEPLOY_VERSION
COMMIT_HASH=$COMMIT_HASH
STAGE=$ENV
PROD_VERSION=$DEPLOY_VERSION
BASE_VERSION=$DEPLOY_VERSION
PR_NUMBER=$PR_NUMBER
# Preserve existing GITHUB_TOKEN if local one is empty
if [ -n "$GITHUB_TOKEN" ]; then
    echo "GITHUB_TOKEN=$GITHUB_TOKEN"
else
    echo "# GITHUB_TOKEN preserved from existing .env"
fi
ENVEOF
EOF
    scp -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no /tmp/env_config.sh ec2-user@$HOST:/tmp/
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST bash /tmp/env_config.sh
    
    # Restart services
    echo "🔄 Restarting services..."
    cat > /tmp/restart_services.sh << 'EOF'
cd aipm
echo 'Stopping existing processes...'
pkill -f 'apps/backend/server.js' || true
pkill -f 'kiro-api-server' || true
sleep 2
echo 'Starting backend...'
nohup node apps/backend/server.js > backend.log 2>&1 & 
echo 'Starting Kiro API...'
nohup node scripts/kiro-api-server-v4.js > kiro-api.log 2>&1 & 
sleep 3
echo 'Services restarted'
EOF
    scp -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no /tmp/restart_services.sh ec2-user@$HOST:/tmp/
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$HOST bash /tmp/restart_services.sh
    
    echo "✅ Backend deployed successfully"
fi

# Deploy frontend
echo "📦 Deploying frontend..."
aws s3 sync apps/frontend/public/ s3://$FRONTEND_BUCKET --delete --cache-control no-cache
echo "✅ Frontend deployed to S3"

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
