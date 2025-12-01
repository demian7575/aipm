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
  
  echo '📥 Pulling latest changes from develop...'
  cd $REPO_PATH
  git fetch origin
  git checkout develop
  git pull origin develop
"

# Install dependencies in repo
echo "📦 Installing dependencies..."
ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "
  cd $REPO_PATH/scripts/workers
  npm install > /dev/null 2>&1
"

# Start server from repo directory
echo "🚀 Starting terminal server from repository..."
ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "
  cd $REPO_PATH/scripts/workers
  REPO_PATH=$REPO_PATH nohup node terminal-server.js > terminal-server.log 2>&1 &
  sleep 2
  if ps aux | grep -v grep | grep terminal-server > /dev/null; then
    echo '✅ Terminal server started from $REPO_PATH/scripts/workers'
    tail -5 terminal-server.log
  else
    echo '❌ Failed to start server'
    cat terminal-server.log
    exit 1
  fi
"

