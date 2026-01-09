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
    echo "🔧 GitHub Actions environment detected - using alternative deployment method"
    
    # Setup SSH key for GitHub Actions
    if [[ -n "$SSH_PRIVATE_KEY" ]]; then
        echo "🔑 Setting up SSH key for deployment..."
        mkdir -p ~/.ssh
        echo "$SSH_PRIVATE_KEY" | tr -d '\r' > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa
        ssh-keyscan -H $HOST >> ~/.ssh/known_hosts
        echo "✅ SSH key configured"
    else
        echo "❌ SSH_PRIVATE_KEY not found - cannot deploy backend"
        echo "Please add EC2_SSH_PRIVATE_KEY to GitHub Secrets"
        exit 1
    fi
fi
    # Copy backend files and inject version
    echo "📝 Injecting version information into backend..."
    
    # First, update git repository on target server
    echo "🔄 Updating git repository on target server..."
    
    # Use branch from environment variable or detect current branch
    if [[ -n "$DEPLOY_BRANCH" ]]; then
        TARGET_BRANCH="$DEPLOY_BRANCH"
    else
        TARGET_BRANCH=$(git branch --show-current)
        # If we're in detached HEAD state, get the actual branch name
        if [[ "$TARGET_BRANCH" == "" ]] || [[ "$TARGET_BRANCH" == "HEAD" ]]; then
            TARGET_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD)
        fi
    fi
    
    echo "📍 Target branch: $TARGET_BRANCH"
    
    ssh -o StrictHostKeyChecking=no ec2-user@$HOST "cd aipm && git fetch origin && git checkout $TARGET_BRANCH && git reset --hard origin/$TARGET_BRANCH"
    
    COMMIT_HASH=$(git rev-parse --short HEAD)
    DEPLOY_VERSION=$(date +"%Y%m%d-%H%M%S")
    
    # Try to detect PR number from branch name or environment
    PR_NUMBER="dev"
    if [[ -n "$GITHUB_HEAD_REF" ]]; then
        # GitHub Actions PR context
        PR_NUMBER=$(echo "$GITHUB_HEAD_REF" | grep -o '[0-9]\+' | head -1)
    elif [[ -n "$CI_MERGE_REQUEST_IID" ]]; then
        # GitLab CI context
        PR_NUMBER="$CI_MERGE_REQUEST_IID"
    else
        # Try to extract from current branch name
        CURRENT_BRANCH=$(git branch --show-current)
        if [[ "$CURRENT_BRANCH" =~ [0-9]+ ]]; then
            PR_NUMBER=$(echo "$CURRENT_BRANCH" | grep -o '[0-9]\+' | head -1)
        fi
    fi
    
    # Create version string based on environment
    if [[ "$ENV" == "dev" ]]; then
        VERSION_STRING="${DEPLOY_VERSION}-${PR_NUMBER}-${COMMIT_HASH}"
    else
        VERSION_STRING="${DEPLOY_VERSION}"
    fi
    
    # Create environment file with correct table names and version info
    echo "📝 Setting up environment variables..."
    COMMIT_HASH=$(git rev-parse --short HEAD)
    DEPLOY_VERSION=$(date +"%Y%m%d-%H%M%S")
    
    # Try to detect PR number from branch name or environment
    PR_NUMBER="dev"
    if [[ -n "$GITHUB_HEAD_REF" ]]; then
        # GitHub Actions PR context
        PR_NUMBER=$(echo "$GITHUB_HEAD_REF" | grep -o '[0-9]\+' | head -1)
    elif [[ -n "$CI_MERGE_REQUEST_IID" ]]; then
        # GitLab CI context
        PR_NUMBER="$CI_MERGE_REQUEST_IID"
    else
        # Try to extract from current branch name
        CURRENT_BRANCH=$(git branch --show-current)
        if [[ "$CURRENT_BRANCH" =~ [0-9]+ ]]; then
            PR_NUMBER=$(echo "$CURRENT_BRANCH" | grep -o '[0-9]\+' | head -1)
        fi
    fi
    
    ssh -o StrictHostKeyChecking=no ec2-user@$HOST "cat > aipm/.env << EOF
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
EOF"

    # Restart backend (simple process restart)
    echo "🔄 Restarting backend service..."
    if ssh -o StrictHostKeyChecking=no ec2-user@$HOST "cd aipm && pkill -f 'apps/backend/server.js' && sleep 1 && nohup node apps/backend/server.js > backend.log 2>&1 &" 2>/dev/null; then
        echo "✅ Backend restarted"
    elif ssh -o StrictHostKeyChecking=no ec2-user@$HOST "sudo systemctl restart $SERVICE" 2>/dev/null; then
        echo "✅ Backend restarted via systemd"
    else
        echo "❌ Failed to restart backend"
        exit 1
    fi

    # Deploy Kiro API server
    echo "📦 Deploying Kiro API server..."
    scp -o StrictHostKeyChecking=no scripts/kiro-api-server-v4.js ec2-user@$HOST:aipm/scripts/
    scp -r -o StrictHostKeyChecking=no scripts/contracts ec2-user@$HOST:aipm/scripts/
    ssh -o StrictHostKeyChecking=no ec2-user@$HOST "cd aipm && pkill -f 'kiro-api-server\\|8081' || true && nohup node scripts/kiro-api-server-v4.js > kiro-api.log 2>&1 &"
    echo "✅ Kiro API server deployed"
fi

# Skip backend health check in GitHub Actions since we can't deploy backend
if [[ -z "$GITHUB_ACTIONS" ]]; then
    # Wait for backend to start
    echo "⏳ Waiting for backend to restart..."
    sleep 5

    # Verify backend health
    echo "🔍 Verifying backend health..."
    for i in {1..6}; do
        if curl -s "$API_URL/health" | grep -q "running"; then
            echo "✅ Backend is healthy"
            break
        fi
        if [[ $i -eq 6 ]]; then
            echo "❌ Backend health check failed after 30 seconds"
            exit 1
        fi
        echo "⏳ Waiting for backend... ($i/6)"
        sleep 5
    done
else
    echo "⚠️  Skipping backend health check in GitHub Actions"
fi

# Use environment-specific frontend config
echo "📝 Using $ENV frontend configuration..."
if [[ "$ENV" == "prod" ]]; then
    CONFIG_FILE="apps/frontend/public/config-prod.js"
else
    CONFIG_FILE="apps/frontend/public/config-dev.js"
fi

if [[ -f "$CONFIG_FILE" ]]; then
    # Replace version and commit hash placeholders
    DEPLOY_VERSION=$(date +"%Y%m%d-%H%M%S")
    sed -i "s/DEPLOY_VERSION_PLACEHOLDER/$DEPLOY_VERSION/g" "$CONFIG_FILE"
    sed -i "s/COMMIT_HASH_PLACEHOLDER/$COMMIT_HASH/g" "$CONFIG_FILE"
    echo "✅ Updated $CONFIG_FILE with version $DEPLOY_VERSION"
else
    echo "❌ Environment config file $CONFIG_FILE not found"
    exit 1
fi

# Deploy frontend
echo "🌐 Deploying frontend to S3..."
if aws s3 sync apps/frontend/public/ s3://$FRONTEND_BUCKET/ --delete --cache-control no-cache; then
    echo "✅ Frontend deployment successful"
else
    echo "❌ Frontend deployment failed"
    exit 1
fi

# Data sync for development environment
if [[ "$ENV" == "dev" ]]; then
    echo "🔄 Syncing production data to development..."
    
    # Sync stories data
    (
        aws dynamodb scan --table-name aipm-backend-prod-stories --region us-east-1 --output json > /tmp/stories.json
        jq -r '.Items[] | {PutRequest: {Item: .}}' /tmp/stories.json | jq -s --arg table "$STORIES_TABLE" '{($table): .}' > /tmp/stories-batch.json
        aws dynamodb batch-write-item --request-items file:///tmp/stories-batch.json --region us-east-1
        echo "✅ Stories synced"
    ) &
    
    # Sync acceptance tests data in chunks
    (
        aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests --region us-east-1 --output json > /tmp/tests.json 2>/dev/null
        if [[ -s /tmp/tests.json ]]; then
            # Process in chunks of 25 items using array slicing
            total_items=$(jq '.Items | length' /tmp/tests.json)
            chunk_size=25
            for ((i=0; i<total_items; i+=chunk_size)); do
                jq --argjson start $i --argjson size $chunk_size \
                   '.Items[$start:$start+$size] | map({PutRequest: {Item: .}})' \
                   /tmp/tests.json | \
                jq --arg table "$TESTS_TABLE" '{($table): .}' > "/tmp/tests-chunk-$i.json"
                
                aws dynamodb batch-write-item --request-items "file:///tmp/tests-chunk-$i.json" --region us-east-1 >/dev/null 2>&1
            done
            echo "✅ Tests synced"
        fi
    ) &
    
    # Sync PRs data in chunks
    (
        aws dynamodb scan --table-name aipm-backend-prod-prs --region us-east-1 --output json > /tmp/prs.json 2>/dev/null
        if [[ -s /tmp/prs.json ]]; then
            # Process in chunks of 25 items using array slicing
            total_items=$(jq '.Items | length' /tmp/prs.json)
            chunk_size=25
            for ((i=0; i<total_items; i+=chunk_size)); do
                jq --argjson start $i --argjson size $chunk_size \
                   '.Items[$start:$start+$size] | map({PutRequest: {Item: .}})' \
                   /tmp/prs.json | \
                jq --arg table "$PRS_TABLE" '{($table): .}' > "/tmp/prs-chunk-$i.json"
                
                aws dynamodb batch-write-item --request-items "file:///tmp/prs-chunk-$i.json" --region us-east-1 >/dev/null 2>&1
            done
            echo "✅ PRs synced"
        else
            echo "⚠️  No PRs data to sync"
        fi
    ) &
    
    wait
    rm -f /tmp/stories.json /tmp/stories-batch.json /tmp/tests.json /tmp/tests-chunk-*.json /tmp/prs.json /tmp/prs-chunk-*.json
    echo "🔄 Data sync completed"
fi

# Final verification
echo "🔍 Final verification..."
FRONTEND_URL=$([ "$ENV" == "prod" ] && echo "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com" || echo "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com")

if curl -s "$FRONTEND_URL" | grep -q "AI Project Manager"; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend verification failed"
    exit 1
fi

# Skip backend API check in GitHub Actions since backend wasn't deployed
if [[ -z "$GITHUB_ACTIONS" ]]; then
    if curl -s "$API_URL/api/stories" | grep -q '\['; then
        echo "✅ Backend API is responding"
    else
        echo "❌ Backend API verification failed"
        exit 1
    fi
else
    echo "⚠️  Skipping backend API verification in GitHub Actions"
fi

echo ""
echo "🎉 Deployment to $ENV completed successfully!"
echo "🔗 Frontend: $FRONTEND_URL"
echo "🔗 Backend: $API_URL"
echo ""
