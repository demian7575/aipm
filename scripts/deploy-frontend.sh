#!/bin/bash
# Deploy frontend with environment-specific config

set -e

ENVIRONMENT=${1:-prod}

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🚀 Deploying production frontend..."
    aws s3 cp apps/frontend/public/config-prod.js s3://aipm-static-hosting-demo/config.js
    aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --exclude "config*.js" --exclude "*.md"
elif [ "$ENVIRONMENT" = "dev" ]; then
    echo "🚀 Deploying development frontend..."
    aws s3 cp apps/frontend/public/config-dev.js s3://aipm-dev-frontend-hosting/config.js
    aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ --exclude "config*.js" --exclude "*.md"
else
    echo "❌ Invalid environment: $ENVIRONMENT (use 'prod' or 'dev')"
    exit 1
fi

echo "✅ Frontend deployed to $ENVIRONMENT"
