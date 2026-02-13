#!/bin/bash
# Simplified deployment script using EnvironmentFile approach
# Usage: deploy-simple.sh <prod|dev>

set -e

ENV=$1
if [[ -z "$ENV" ]]; then
    echo "Usage: $0 <prod|dev>"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment configuration
source "$SCRIPT_DIR/utilities/load-env-config.sh" "$ENV"

echo "🚀 Deploying to $ENV environment..."
echo "📍 Host: $EC2_IP"

# Step 1: Generate .env file
echo "📝 Generating .env file..."
"$SCRIPT_DIR/utilities/generate-env-file.sh" "$ENV" "/tmp/.env.$ENV"

# Step 2: Deploy code to EC2
echo "📦 Deploying code..."
ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'ENDSSH'
cd aipm
git fetch origin
git reset --hard origin/main
npm install --production --silent
ENDSSH

# Step 3: Deploy .env file
echo "⚙️  Deploying configuration..."
scp -o StrictHostKeyChecking=no "/tmp/.env.$ENV" ec2-user@$EC2_IP:/home/ec2-user/aipm/.env

# Step 4: Deploy service file
echo "🔧 Updating service configuration..."
scp -o StrictHostKeyChecking=no "$PROJECT_ROOT/config/aipm-backend.service" ec2-user@$EC2_IP:/tmp/
ssh ec2-user@$EC2_IP << 'ENDSSH'
sudo cp /tmp/aipm-backend.service /etc/systemd/system/aipm-backend.service
sudo systemctl daemon-reload
ENDSSH

# Step 5: Restart service
echo "🔄 Restarting backend service..."
ssh ec2-user@$EC2_IP << 'ENDSSH'
sudo systemctl restart aipm-backend
ENDSSH

# Step 6: Wait for health check
echo "🏥 Waiting for service to be healthy..."
sleep 5

for i in {1..30}; do
    if curl -sf "http://$EC2_IP:4000/health" > /dev/null 2>&1; then
        echo "✅ Service is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed after 60s"
        echo "📋 Service status:"
        ssh ec2-user@$EC2_IP "sudo systemctl status aipm-backend --no-pager -l"
        exit 1
    fi
    sleep 2
done

echo "🎉 Deployment completed successfully!"
