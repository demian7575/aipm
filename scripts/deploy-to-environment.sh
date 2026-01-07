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
    echo "⚠️  GitHub Actions environment detected - skipping SSH deployment"
    echo "Backend deployment requires SSH access which is not available in GitHub Actions"
    echo "Manual deployment required for backend updates"
else
    # Copy backend files
    scp apps/backend/app.js ec2-user@$HOST:aipm/apps/backend/app.js
    
    # Create environment file with correct table names and version info
    echo "📝 Setting up environment variables..."
    COMMIT_HASH=$(git rev-parse --short HEAD)
    DEPLOY_VERSION=$(date +"%Y%m%d-%H%M%S")
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
EOF"

    # Restart backend (force process restart to ensure env vars are loaded)
    echo "🔄 Restarting backend service..."
    # Create startup script with environment loading
    ssh -o StrictHostKeyChecking=no ec2-user@$HOST "cd aipm && cat > start-backend.sh << 'EOF'
#!/bin/bash
cd /home/ec2-user/aipm
export DEPLOY_VERSION=\$(grep DEPLOY_VERSION .env | cut -d= -f2)
export STAGE=\$(grep STAGE .env | cut -d= -f2)
node apps/backend/server.js
EOF
chmod +x start-backend.sh"

    if ssh -o StrictHostKeyChecking=no ec2-user@$HOST "cd aipm && pkill -f 'apps/backend/server.js' && sleep 1 && nohup ./start-backend.sh > backend.log 2>&1 &" 2>/dev/null; then
        echo "✅ Backend restarted via process restart with environment"
    elif ssh -o StrictHostKeyChecking=no ec2-user@$HOST "sudo systemctl restart $SERVICE" 2>/dev/null; then
        echo "✅ Backend restarted via systemd"
    else
        echo "❌ Failed to restart backend"
        exit 1
    fi
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
    
    # Sync PRs data
    (
        aws dynamodb scan --table-name aipm-backend-prod-prs --region us-east-1 --output json > /tmp/prs.json 2>/dev/null
        if [[ -s /tmp/prs.json ]]; then
            jq -r '.Items[] | {PutRequest: {Item: .}}' /tmp/prs.json | jq -s --arg table "$PRS_TABLE" '{($table): .}' > /tmp/prs-batch.json 2>/dev/null
            if aws dynamodb batch-write-item --request-items file:///tmp/prs-batch.json --region us-east-1; then
                echo "✅ PRs synced"
            else
                echo "⚠️  PRs sync failed"
            fi
        else
            echo "⚠️  No PRs data to sync"
        fi
    ) &
    
    wait
    rm -f /tmp/stories.json /tmp/stories-batch.json /tmp/tests.json /tmp/tests-chunk-*.json /tmp/prs.json /tmp/prs-batch.json
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
