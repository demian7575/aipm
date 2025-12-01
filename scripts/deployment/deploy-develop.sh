#!/bin/bash

# Deploy origin/develop to development environment
echo "🚀 Deploying origin/develop to DEVELOPMENT environment..."

# Ensure we're on develop branch
git checkout develop
git pull origin develop

# Set development config
cp apps/frontend/public/config-dev.js apps/frontend/public/config.js

# Deploy to development S3
echo "📦 Deploying to development S3..."
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ --region us-east-1 --exclude "*.md" --delete

# Verify deployment
echo "✅ Verifying development deployment..."
curl -s "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/config.js" | grep -q "development" && echo "✅ Development config verified" || echo "❌ Development config failed"

echo "🎉 Development deployment complete!"
echo "🌐 URL: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
