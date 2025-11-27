#!/bin/bash

# Deploy origin/main to production environment
echo "🚀 Deploying origin/main to PRODUCTION environment..."

# Ensure we're on main branch
git checkout main
git pull origin main

# Set production config
cp config-prod.js apps/frontend/public/config.js

# Deploy to production S3
echo "📦 Deploying to production S3..."
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --region us-east-1 --exclude "*.md" --delete

# Verify deployment
echo "✅ Verifying production deployment..."
curl -s "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/config.js" | grep -q "production" && echo "✅ Production config verified" || echo "❌ Production config failed"

echo "🎉 Production deployment complete!"
echo "🌐 URL: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
