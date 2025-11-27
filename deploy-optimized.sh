#!/bin/bash

set -e

echo "🚀 Optimized AIPM Deployment (Size-Optimized)"
echo ""

# Backup original package.json
cp package.json package.json.backup

# Use production package.json
cp package.prod.json package.json

# Clean install with production dependencies only
echo "📦 Installing minimal production dependencies..."
rm -rf node_modules
npm install --production --no-optional

# Deploy with optimized package
echo "🏗️ Deploying optimized Lambda..."
serverless deploy --stage prod --region us-east-1

# Restore original package.json
mv package.json.backup package.json

echo ""
echo "✅ Optimized deployment completed!"
echo "📊 Lambda package should now be under 50MB"
