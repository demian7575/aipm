#!/bin/bash
# Quick script to install Kiro services on Production EC2
# Run from local machine

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" prod

PROD_IP="$EC2_IP"

echo "🚀 Deploying code and installing Kiro services on Production EC2..."
echo ""

# Step 1: Deploy latest code
echo "📦 Step 1: Deploying latest code..."
./bin/deploy-prod prod

echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Step 2: Install services via SSH
echo ""
echo "🔧 Step 2: Installing systemd services..."
ssh -i ~/.ssh/id_rsa ec2-user@$PROD_IP << 'ENDSSH'
cd aipm
echo "📍 Current directory: $(pwd)"
echo "📍 Installing services..."
sudo ./scripts/utilities/install-kiro-services.sh
ENDSSH

echo ""
echo "✅ Installation complete!"
echo ""
echo "🔍 Verifying services..."
ssh -i ~/.ssh/id_rsa ec2-user@$PROD_IP << 'ENDSSH'
echo "Session Pool:"
curl -s http://localhost:8082/health | jq
echo ""
echo "Semantic API:"
curl -s http://localhost:8083/health | jq
ENDSSH

echo ""
echo "✅ All done! Services are running."
