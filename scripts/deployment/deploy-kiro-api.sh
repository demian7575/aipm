#!/bin/bash
# Deploy Kiro API Server to EC2

set -e

EC2_HOST="${EC2_HOST:-44.220.45.57}"
EC2_USER="${EC2_USER:-ec2-user}"

echo "🚀 Deploying Kiro API Server to EC2..."

# Copy files to EC2
echo "📦 Copying files..."
scp scripts/workers/kiro-api-server.js ${EC2_USER}@${EC2_HOST}:~/aipm/scripts/workers/
scp scripts/deployment/setup-kiro-api-service.sh ${EC2_USER}@${EC2_HOST}:~/aipm/scripts/deployment/

# Run setup script on EC2
echo "⚙️  Setting up service..."
ssh ${EC2_USER}@${EC2_HOST} "cd ~/aipm && bash scripts/deployment/setup-kiro-api-service.sh"

# Verify deployment
echo "🔍 Verifying deployment..."
if ssh ${EC2_USER}@${EC2_HOST} "curl -s http://localhost:8081/health" | grep -q "running"; then
    echo "✅ Kiro API Server deployed successfully!"
    echo ""
    echo "Endpoint: http://${EC2_HOST}:8081"
else
    echo "❌ Deployment verification failed"
    exit 1
fi
