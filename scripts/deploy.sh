#!/bin/bash
# Deploy AIPM to production using centralized configuration
set -e

echo "🚀 Deploying AIPM to production..."

# Generate configuration from centralized source
./scripts/generate-config.sh

# Deploy frontend
echo "📦 Deploying frontend..."
aws s3 cp apps/frontend/public/config.js s3://aipm-static-hosting-demo/config.js
aws s3 cp apps/frontend/public/app.js s3://aipm-static-hosting-demo/app.js

# Deploy backend
echo "🔧 Deploying backend..."
scp scripts/kiro-api-server-v4.js ec2-user@44.220.45.57:/home/ec2-user/aipm/scripts/kiro-api-server-v4.js
scp scripts/.env ec2-user@44.220.45.57:/home/ec2-user/aipm/scripts/.env

# Restart services
echo "🔄 Restarting services..."
ssh ec2-user@44.220.45.57 'sudo systemctl restart kiro-api-v4'

echo "✅ Deployment complete!"
echo "   Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "   API: http://44.220.45.57:3000"
