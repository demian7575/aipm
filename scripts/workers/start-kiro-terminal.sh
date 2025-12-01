#!/bin/bash
# Start or restart Kiro terminal server on EC2

EC2_IP="44.220.45.57"
REPO_PATH="/home/ec2-user/aipm"

echo "🔌 Connecting to EC2..."

# Kill existing server
ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "pkill -f terminal-server" 2>/dev/null

# Check if repo exists, clone if not
ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "
  if [ ! -d $REPO_PATH ]; then
    echo '📦 Cloning repository...'
    cd ~ && git clone https://github.com/demian7575/aipm.git
  fi
"

# Copy latest terminal server files
echo "📤 Uploading terminal server..."
scp -o StrictHostKeyChecking=no \
  scripts/workers/terminal-server.js \
  scripts/workers/package.json \
  ec2-user@$EC2_IP:~/

# Install dependencies and start server
echo "🚀 Starting terminal server..."
ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "
  npm install > /dev/null 2>&1
  REPO_PATH=$REPO_PATH nohup node terminal-server.js > terminal-server.log 2>&1 &
  sleep 2
  if ps aux | grep -v grep | grep terminal-server > /dev/null; then
    echo '✅ Terminal server started'
    tail -5 terminal-server.log
  else
    echo '❌ Failed to start server'
    cat terminal-server.log
    exit 1
  fi
"
