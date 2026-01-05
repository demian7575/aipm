#!/bin/bash
set -e

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
scp apps/backend/app.js ec2-user@$HOST:aipm/apps/backend/app.js

# Restart backend (try systemd first, fallback to process restart)
echo "🔄 Restarting backend service..."
if ssh -o StrictHostKeyChecking=no ec2-user@$HOST "sudo systemctl restart $SERVICE" 2>/dev/null; then
    echo "✅ Backend restarted via systemd"
elif ssh -o StrictHostKeyChecking=no ec2-user@$HOST "pkill -f 'apps/backend/server.js' && cd aipm && nohup node apps/backend/server.js > backend.log 2>&1 &" 2>/dev/null; then
    echo "✅ Backend restarted via process restart"
else
    echo "❌ Failed to restart backend"
    exit 1
fi

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

# Create environment-specific frontend config
echo "📝 Creating $ENV frontend configuration..."
cat > apps/frontend/public/config.js << EOF
window.CONFIG = {
  API_BASE_URL: '$API_URL',
  apiEndpoint: '$API_URL',
  EC2_TERMINAL_URL: 'ws://$HOST:8080',
  ENVIRONMENT: '$ENV',
  environment: '$ENV',
  stage: '$ENV',
  region: 'us-east-1',
  storiesTable: '$STORIES_TABLE',
  acceptanceTestsTable: '$TESTS_TABLE',
  DEBUG: $([ "$ENV" == "dev" ] && echo "true" || echo "false")
};
EOF

# Deploy frontend
echo "🌐 Deploying frontend to S3..."
aws s3 sync apps/frontend/public/ s3://$FRONTEND_BUCKET/ --delete --cache-control no-cache

# Data sync for development environment
if [[ "$ENV" == "dev" ]]; then
    echo "🔄 Syncing production data to development..."
    
    # Check if dev tables exist, create if not
    aws dynamodb describe-table --table-name $STORIES_TABLE --region us-east-1 >/dev/null 2>&1 || {
        echo "📋 Creating development stories table..."
        aws dynamodb create-table \
            --table-name $STORIES_TABLE \
            --attribute-definitions AttributeName=id,AttributeType=N \
            --key-schema AttributeName=id,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region us-east-1
        aws dynamodb wait table-exists --table-name $STORIES_TABLE --region us-east-1
    }
    
    aws dynamodb describe-table --table-name $TESTS_TABLE --region us-east-1 >/dev/null 2>&1 || {
        echo "📋 Creating development tests table..."
        aws dynamodb create-table \
            --table-name $TESTS_TABLE \
            --attribute-definitions AttributeName=id,AttributeType=S \
            --key-schema AttributeName=id,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region us-east-1
        aws dynamodb wait table-exists --table-name $TESTS_TABLE --region us-east-1
    }
    
    # Sync stories data (simplified)
    echo "📊 Syncing stories data..."
    aws dynamodb scan --table-name aipm-backend-prod-stories --region us-east-1 --output json > /tmp/prod-stories.json
    
    if [[ -s /tmp/prod-stories.json ]]; then
        # Clear dev table first
        aws dynamodb scan --table-name $STORIES_TABLE --region us-east-1 --output json | \
        jq -r '.Items[] | {DeleteRequest: {Key: {id: .id}}}' | \
        jq -s --arg table "$STORIES_TABLE" '{($table): .}' > /tmp/delete-stories.json
        
        if [[ -s /tmp/delete-stories.json ]] && [[ "$(cat /tmp/delete-stories.json)" != "{\"$STORIES_TABLE\":[]}" ]]; then
            aws dynamodb batch-write-item --request-items file:///tmp/delete-stories.json --region us-east-1 >/dev/null 2>&1
        fi
        
        # Copy production data
        jq -r '.Items[] | {PutRequest: {Item: .}}' /tmp/prod-stories.json | \
        jq -s --arg table "$STORIES_TABLE" '{($table): .}' > /tmp/stories-batch.json
        
        aws dynamodb batch-write-item --request-items file:///tmp/stories-batch.json --region us-east-1
        echo "✅ Stories data synced"
    fi
    
    # Skip acceptance tests sync due to data structure complexity
    echo "⚠️  Skipping acceptance tests sync (data structure complexity)"
    
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

if curl -s "$API_URL/api/stories" | grep -q '\['; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API verification failed"
    exit 1
fi

echo ""
echo "🎉 Deployment to $ENV completed successfully!"
echo "🔗 Frontend: $FRONTEND_URL"
echo "🔗 Backend: $API_URL"
echo ""
