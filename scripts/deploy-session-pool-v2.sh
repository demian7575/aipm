#!/bin/bash
# Deploy improved Kiro session pool with systemd management

set -e

echo "🚀 Deploying Kiro Session Pool V2..."

# Stop old session pool if running
if pgrep -f "kiro-session-pool.js" > /dev/null; then
    echo "⏹️  Stopping old session pool..."
    pkill -f "kiro-session-pool.js" || true
    sleep 2
fi

# Kill any orphaned kiro-cli processes
echo "🧹 Cleaning up orphaned Kiro processes..."
pkill -f "kiro-cli-chat" || true
sleep 1

# Install systemd service files
echo "📦 Installing systemd service files..."
sudo cp config/kiro-session@.service /etc/systemd/system/
sudo cp config/kiro-session@.socket /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start socket-activated sessions
for i in 1 2; do
    echo "  Starting kiro-session@${i}..."
    sudo systemctl enable kiro-session@${i}.socket
    sudo systemctl start kiro-session@${i}.socket
done

# Start new session pool
echo "▶️  Starting session pool V2..."
nohup node scripts/kiro-session-pool-v2.js > /tmp/kiro-pool-startup.log 2>&1 &
sleep 3

# Check status
if pgrep -f "kiro-session-pool-v2.js" > /dev/null; then
    echo "✅ Session pool V2 started successfully"
    curl -s http://localhost:8082/health | jq '.'
else
    echo "❌ Failed to start session pool"
    cat /tmp/kiro-pool-startup.log
    exit 1
fi

echo "✅ Deployment complete"
