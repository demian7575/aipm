#!/bin/bash

set -e

echo "🚀 Deploying Kiro V3 to Development Environment"
echo "================================================"

# 1. Deploy queue table
echo ""
echo "📦 Step 1: Deploy DynamoDB queue table..."
aws cloudformation deploy \
  --template-file infrastructure/kiro-queue-table.yml \
  --stack-name aipm-kiro-queue-dev \
  --parameter-overrides Stage=dev \
  --region us-east-1 \
  --no-fail-on-empty-changeset

echo "✅ Queue table deployed"

# 2. Copy files to EC2
echo ""
echo "📤 Step 2: Copy files to EC2..."
EC2_HOST="ec2-user@44.220.45.57"

# Create contracts directory
ssh $EC2_HOST "mkdir -p /home/ec2-user/aipm/scripts/contracts"

# Copy contract files
scp scripts/contracts/contracts.json $EC2_HOST:/home/ec2-user/aipm/scripts/contracts/
scp scripts/kiro-queue-manager.js $EC2_HOST:/home/ec2-user/aipm/scripts/
scp scripts/kiro-api-server-v3.js $EC2_HOST:/home/ec2-user/aipm/scripts/
scp scripts/kiro-worker-v3.js $EC2_HOST:/home/ec2-user/aipm/scripts/

echo "✅ Files copied"

# 3. Install dependencies on EC2
echo ""
echo "📦 Step 3: Install dependencies on EC2..."
ssh $EC2_HOST "cd /home/ec2-user/aipm && npm install node-fetch @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb"

echo "✅ Dependencies installed"

# 4. Stop old services
echo ""
echo "🛑 Step 4: Stop old services..."
ssh $EC2_HOST "sudo systemctl stop kiro-api || true"
ssh $EC2_HOST "sudo systemctl stop kiro-worker || true"

# 5. Create systemd service files
echo ""
echo "📝 Step 5: Create systemd services..."

# Kiro API V3 service
ssh $EC2_HOST "sudo tee /etc/systemd/system/kiro-api-v3.service > /dev/null << 'EOF'
[Unit]
Description=Kiro API Server V3 (JSON Contract)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
Environment=KIRO_CLI_PATH=/home/ec2-user/.local/bin/kiro-cli
Environment=KIRO_WORKING_DIR=/home/ec2-user/aipm
Environment=KIRO_API_PORT=8081
Environment=NODE_ENV=development
ExecStart=/usr/bin/node scripts/kiro-api-server-v3.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF"

# Kiro Worker V3 service
ssh $EC2_HOST "sudo tee /etc/systemd/system/kiro-worker-v3.service > /dev/null << 'EOF'
[Unit]
Description=Kiro Worker V3 (Queue Processor)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
Environment=KIRO_QUEUE_TABLE=aipm-kiro-queue-dev
Environment=KIRO_API_URL=http://localhost:8081
Environment=POLL_INTERVAL=1000
Environment=AWS_REGION=us-east-1
ExecStart=/usr/bin/node scripts/kiro-worker-v3.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF"

echo "✅ Service files created"

# 6. Start services
echo ""
echo "🚀 Step 6: Start services..."
ssh $EC2_HOST "sudo systemctl daemon-reload"
ssh $EC2_HOST "sudo systemctl enable kiro-api-v3"
ssh $EC2_HOST "sudo systemctl enable kiro-worker-v3"
ssh $EC2_HOST "sudo systemctl start kiro-api-v3"
ssh $EC2_HOST "sudo systemctl start kiro-worker-v3"

sleep 3

# 7. Check service status
echo ""
echo "📊 Step 7: Check service status..."
echo ""
echo "Kiro API V3:"
ssh $EC2_HOST "sudo systemctl status kiro-api-v3 --no-pager -l" || true
echo ""
echo "Kiro Worker V3:"
ssh $EC2_HOST "sudo systemctl status kiro-worker-v3 --no-pager -l" || true

# 8. Test health endpoint
echo ""
echo "🧪 Step 8: Test health endpoint..."
sleep 2
curl -s http://44.220.45.57:8081/health | jq '.'

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Services:"
echo "   Kiro API V3: http://44.220.45.57:8081"
echo "   Health: http://44.220.45.57:8081/health"
echo ""
echo "📝 Logs:"
echo "   API: ssh ec2-user@44.220.45.57 'sudo journalctl -u kiro-api-v3 -f'"
echo "   Worker: ssh ec2-user@44.220.45.57 'sudo journalctl -u kiro-worker-v3 -f'"
