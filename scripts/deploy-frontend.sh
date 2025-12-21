#!/bin/bash

# AIPM Frontend Deployment Script
# Ensures S3 config.js stays in sync with local changes

set -e

S3_BUCKET="aipm-static-hosting-demo"
LOCAL_CONFIG="apps/frontend/public/config.js"

echo "🚀 Deploying AIPM Frontend to S3..."

# Validate config file exists
if [ ! -f "$LOCAL_CONFIG" ]; then
    echo "❌ Config file not found: $LOCAL_CONFIG"
    exit 1
fi

# Show current config
echo "📋 Current config:"
grep -E "(API_BASE_URL|apiEndpoint)" "$LOCAL_CONFIG"

# Deploy config with cache-busting headers
echo "📤 Uploading config.js..."
aws s3 cp "$LOCAL_CONFIG" "s3://$S3_BUCKET/config.js" \
    --cache-control "no-cache, no-store, must-revalidate, max-age=0" \
    --content-type "application/javascript"

# Deploy app.js
echo "📤 Uploading app.js..."
aws s3 cp "apps/frontend/public/app.js" "s3://$S3_BUCKET/app.js" \
    --cache-control "max-age=300" \
    --content-type "application/javascript"

# Deploy index.html
echo "📤 Uploading index.html..."
aws s3 cp "apps/frontend/public/index.html" "s3://$S3_BUCKET/index.html" \
    --cache-control "max-age=300" \
    --content-type "text/html"

# Verify deployment
echo "🔍 Verifying deployment..."
DEPLOYED_CONFIG=$(curl -s "http://$S3_BUCKET.s3-website-us-east-1.amazonaws.com/config.js" | grep API_BASE_URL | head -1)
echo "✅ Deployed config: $DEPLOYED_CONFIG"

echo "🎉 Frontend deployment complete!"
echo "🌐 URL: http://$S3_BUCKET.s3-website-us-east-1.amazonaws.com/"
