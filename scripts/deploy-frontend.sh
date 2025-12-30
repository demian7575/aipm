#!/bin/bash
# Deploy frontend with environment-specific config

set -e

ENVIRONMENT=${1:-prod}

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🚀 Deploying production frontend..."
    
    # Upload config first
    aws s3 cp apps/frontend/public/config-prod.js s3://aipm-static-hosting-demo/config.js
    
    # Upload critical files explicitly to ensure they're updated
    aws s3 cp apps/frontend/public/index.html s3://aipm-static-hosting-demo/index.html
    aws s3 cp apps/frontend/public/app.js s3://aipm-static-hosting-demo/app.js
    aws s3 cp apps/frontend/public/styles.css s3://aipm-static-hosting-demo/styles.css
    
    # Sync remaining files
    aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --exclude "config*.js" --exclude "*.md" --delete
    
elif [ "$ENVIRONMENT" = "dev" ]; then
    echo "🚀 Deploying development frontend..."
    
    # Upload config first
    aws s3 cp apps/frontend/public/config-dev.js s3://aipm-dev-frontend-hosting/config.js
    
    # Upload critical files explicitly to ensure they're updated
    aws s3 cp apps/frontend/public/index.html s3://aipm-dev-frontend-hosting/index.html
    aws s3 cp apps/frontend/public/app.js s3://aipm-dev-frontend-hosting/app.js
    aws s3 cp apps/frontend/public/styles.css s3://aipm-dev-frontend-hosting/styles.css
    
    # Sync remaining files
    aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ --exclude "config*.js" --exclude "*.md" --delete
    
else
    echo "❌ Invalid environment: $ENVIRONMENT (use 'prod' or 'dev')"
    exit 1
fi

echo "✅ Frontend deployed to $ENVIRONMENT"
