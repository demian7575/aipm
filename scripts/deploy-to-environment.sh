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
elif [[ "$ENV" == "dev" ]]; then
    HOST="44.222.168.46"
    SERVICE="aipm-backend"
    FRONTEND_BUCKET="aipm-dev-frontend-hosting"
    API_URL="http://44.222.168.46"
    STORIES_TABLE="aipm-backend-dev-stories"
    TESTS_TABLE="aipm-backend-dev-acceptance-tests"
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
EOF"

    # Restart backend (force process restart to ensure env vars are loaded)
    echo "🔄 Restarting backend service..."
    if ssh -o StrictHostKeyChecking=no ec2-user@$HOST "pkill -f 'apps/backend/server.js' && cd aipm && export STORIES_TABLE=$STORIES_TABLE && export ACCEPTANCE_TESTS_TABLE=$TESTS_TABLE && export AWS_REGION=us-east-1 && export DEPLOY_VERSION=$DEPLOY_VERSION && export COMMIT_HASH=$COMMIT_HASH && nohup node apps/backend/server.js > backend.log 2>&1 &" 2>/dev/null; then
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
if [[ -f "apps/frontend/public/config.$ENV.js" ]]; then
    # Replace version placeholder with actual deployment timestamp
    DEPLOY_VERSION=$(date +"%Y%m%d-%H%M%S")
    sed "s/DEPLOY_TIMESTAMP_PLACEHOLDER/$DEPLOY_VERSION/g" "apps/frontend/public/config.$ENV.js" > "apps/frontend/public/config.js"
    echo "✅ Copied config.$ENV.js to config.js with version $DEPLOY_VERSION"
else
    echo "❌ Environment config file config.$ENV.js not found"
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
    
    # Check if dev tables exist, create if not
    echo "🔍 Checking if development tables exist..."
    aws dynamodb describe-table --table-name $STORIES_TABLE --region us-east-1 >/dev/null 2>&1 || {
        echo "📋 Creating development stories table..."
        aws dynamodb create-table \
            --table-name $STORIES_TABLE \
            --attribute-definitions AttributeName=id,AttributeType=N \
            --key-schema AttributeName=id,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region us-east-1
        echo "⏳ Waiting for stories table to be ready..."
        aws dynamodb wait table-exists --table-name $STORIES_TABLE --region us-east-1
        echo "✅ Stories table created"
    }
    
    aws dynamodb describe-table --table-name $TESTS_TABLE --region us-east-1 >/dev/null 2>&1 || {
        echo "📋 Creating development tests table..."
        aws dynamodb create-table \
            --table-name $TESTS_TABLE \
            --attribute-definitions AttributeName=id,AttributeType=N \
            --key-schema AttributeName=id,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region us-east-1
        echo "⏳ Waiting for tests table to be ready..."
        aws dynamodb wait table-exists --table-name $TESTS_TABLE --region us-east-1
        echo "✅ Tests table created"
    }
    
    # Sync stories data (simplified)
    echo "📊 Syncing stories data..."
    if aws dynamodb scan --table-name aipm-backend-prod-stories --region us-east-1 --output json > /tmp/prod-stories.json; then
        echo "✅ Production stories data retrieved"
    else
        echo "❌ Failed to retrieve production stories data"
        exit 1
    fi
    
    if [[ -s /tmp/prod-stories.json ]]; then
        echo "📋 Processing production data for sync..."
        
        # Clear dev table first
        echo "🗑️  Clearing development table..."
        if aws dynamodb scan --table-name $STORIES_TABLE --region us-east-1 --output json | \
        jq -r '.Items[] | {DeleteRequest: {Key: {id: .id}}}' | \
        jq -s --arg table "$STORIES_TABLE" '{($table): .}' > /tmp/delete-stories.json; then
            echo "✅ Delete batch prepared"
        else
            echo "❌ Failed to prepare delete batch"
            exit 1
        fi
        
        if [[ -s /tmp/delete-stories.json ]] && [[ "$(cat /tmp/delete-stories.json)" != "{\"$STORIES_TABLE\":[]}" ]]; then
            if aws dynamodb batch-write-item --request-items file:///tmp/delete-stories.json --region us-east-1 >/dev/null 2>&1; then
                echo "✅ Development table cleared"
            else
                echo "⚠️  Failed to clear development table (may be empty)"
            fi
        fi
        
        # Copy production data
        echo "📥 Preparing production data for import..."
        if jq -r '.Items[] | {PutRequest: {Item: .}}' /tmp/prod-stories.json | \
        jq -s --arg table "$STORIES_TABLE" '{($table): .}' > /tmp/stories-batch.json; then
            echo "✅ Import batch prepared"
        else
            echo "❌ Failed to prepare import batch"
            exit 1
        fi
        
        if aws dynamodb batch-write-item --request-items file:///tmp/stories-batch.json --region us-east-1; then
            echo "✅ Stories data synced"
        else
            echo "❌ Failed to sync stories data"
            exit 1
        fi
    fi
    
    # Sync acceptance tests data
    echo "📋 Syncing acceptance tests data..."
    if aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests --region us-east-1 --output json > /tmp/prod-tests.json; then
        echo "✅ Production acceptance tests data retrieved"
        
        if [[ -s /tmp/prod-tests.json ]]; then
            echo "📋 Processing acceptance tests data for sync..."
            
            # Clear dev tests table first
            echo "🗑️  Clearing development tests table..."
            if aws dynamodb scan --table-name $TESTS_TABLE --region us-east-1 --output json | \
            jq -r '.Items[] | {DeleteRequest: {Key: {id: .id}}}' | \
            jq -s --arg table "$TESTS_TABLE" '{($table): .}' > /tmp/delete-tests.json; then
                echo "✅ Delete batch prepared for tests"
            else
                echo "❌ Failed to prepare delete batch for tests"
                exit 1
            fi
            
            if [[ -s /tmp/delete-tests.json ]] && [[ "$(cat /tmp/delete-tests.json)" != "{\"$TESTS_TABLE\":[]}" ]]; then
                if aws dynamodb batch-write-item --request-items file:///tmp/delete-tests.json --region us-east-1 >/dev/null 2>&1; then
                    echo "✅ Development tests table cleared"
                else
                    echo "⚠️  Failed to clear development tests table (may be empty)"
                fi
            fi
            
            # Copy production tests data
            echo "📥 Preparing acceptance tests data for import..."
            if jq -r '.Items[] | {PutRequest: {Item: .}}' /tmp/prod-tests.json | \
            jq -s --arg table "$TESTS_TABLE" '{($table): .}' > /tmp/tests-batch.json; then
                echo "✅ Import batch prepared for tests"
            else
                echo "❌ Failed to prepare import batch for tests"
                exit 1
            fi
            
            if aws dynamodb batch-write-item --request-items file:///tmp/tests-batch.json --region us-east-1; then
                echo "✅ Acceptance tests data synced"
            else
                echo "❌ Failed to sync acceptance tests data"
                exit 1
            fi
        fi
    else
        echo "❌ Failed to retrieve production acceptance tests data"
        exit 1
    fi
    
    # Cleanup temp files
    rm -f /tmp/stories-batch.json /tmp/tests-batch.json
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
