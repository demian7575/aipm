#!/bin/bash

set -e

echo "🚀 Deploying Kiro API V4 to Production EC2"
echo "=========================================="

# Configuration
EC2_HOST="ec2-user@44.220.45.57"
SERVICE_NAME="kiro-api-v4"

# 1. Copy files to EC2
echo ""
echo "📤 Step 1: Copy files to EC2..."

# Create directories
ssh $EC2_HOST "mkdir -p /home/ec2-user/aipm/scripts/contracts"

# Copy files
scp scripts/contracts/contracts.json $EC2_HOST:/home/ec2-user/aipm/scripts/contracts/
scp scripts/kiro-api-server-full.js $EC2_HOST:/home/ec2-user/aipm/scripts/kiro-api-server-v4.js

echo "✅ Files copied"

# 2. Install dependencies on EC2
echo ""
echo "📦 Step 2: Install dependencies on EC2..."
ssh $EC2_HOST "cd /home/ec2-user/aipm && npm install --save-dev"

echo "✅ Dependencies installed"

# 3. Stop old service
echo ""
echo "🛑 Step 3: Stop old service..."
ssh $EC2_HOST "sudo systemctl stop $SERVICE_NAME || true"
ssh $EC2_HOST "sudo systemctl disable $SERVICE_NAME || true"

# 4. Create systemd service
echo ""
echo "📝 Step 4: Create systemd service..."

# Get the GITHUB_TOKEN from the EC2 instance
GITHUB_TOKEN_VALUE=$(ssh $EC2_HOST 'echo $GITHUB_TOKEN')

ssh $EC2_HOST "sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=Kiro API Server V4 (Direct Post)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
Environment=KIRO_CLI_PATH=/home/ec2-user/.local/bin/kiro-cli
Environment=KIRO_API_PORT=8081
Environment=NODE_ENV=production
Environment=GITHUB_TOKEN=$GITHUB_TOKEN_VALUE
ExecStart=/usr/bin/node scripts/kiro-api-server-v4.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiro-api-v4

[Install]
WantedBy=multi-user.target
EOF"

# 5. Enable and start service
echo ""
echo "🚀 Step 5: Enable and start service..."
ssh $EC2_HOST "sudo systemctl daemon-reload"
ssh $EC2_HOST "sudo systemctl enable $SERVICE_NAME"
ssh $EC2_HOST "sudo systemctl start $SERVICE_NAME"

# 6. Wait and check status
echo ""
echo "⏳ Step 6: Checking service status..."
sleep 5
ssh $EC2_HOST "sudo systemctl status $SERVICE_NAME --no-pager"

# 7. Test health endpoint
echo ""
echo "🔍 Step 7: Testing health endpoint..."
sleep 2
ssh $EC2_HOST "curl -s http://localhost:8081/health | jq ." || echo "Health check failed"

echo ""
echo "✅ Kiro API V4 deployment complete!"
echo "🔗 Health: http://44.220.45.57:8081/health"
echo "🔗 Enhance: POST http://44.220.45.57:8081/kiro/v4/enhance"
echo ""
echo "📋 To check logs: ssh $EC2_HOST 'sudo journalctl -u $SERVICE_NAME -f'"
echo "📋 To restart: ssh $EC2_HOST 'sudo systemctl restart $SERVICE_NAME'"
