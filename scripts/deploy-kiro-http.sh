#!/bin/bash
# Deploy HTTP-based Kiro session pool

set -e

echo "🚀 Deploying Kiro Session Pool (HTTP Architecture)..."

# Stop old services
echo "⏹️  Stopping old services..."
pkill -f "kiro-session-pool" || true
pkill -f "kiro-wrapper" || true
pkill -f "kiro-cli-chat" || true
sudo systemctl stop kiro-session@1.socket kiro-session@2.socket 2>/dev/null || true
sudo systemctl stop kiro-session@1.service kiro-session@2.service 2>/dev/null || true
sleep 2

# Clean up orphans
echo "🧹 Cleaning up orphaned processes..."
pkill -9 -f "kiro-cli" || true
sleep 1

# Install systemd service
echo "📦 Installing systemd service..."
sudo cp config/kiro-wrapper@.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start wrapper services
echo "▶️  Starting Kiro wrappers..."
for i in 1 2; do
    sudo systemctl enable kiro-wrapper@${i}.service
    sudo systemctl start kiro-wrapper@${i}.service
    echo "  Started kiro-wrapper@${i} on port 900${i}"
done

sleep 3

# Check wrapper health
echo "🔍 Checking wrapper health..."
for i in 1 2; do
    if curl -s http://localhost:900${i}/health | jq -e '.status == "healthy"' > /dev/null; then
        echo "  ✅ Wrapper ${i} healthy"
    else
        echo "  ❌ Wrapper ${i} unhealthy"
    fi
done

# Start session pool
echo "▶️  Starting session pool..."
nohup node scripts/kiro-session-pool-http.js > /tmp/kiro-pool.log 2>&1 &
sleep 3

# Check pool health
if curl -s http://localhost:8082/health | jq -e '.status == "healthy"' > /dev/null; then
    echo "✅ Session pool healthy"
    curl -s http://localhost:8082/health | jq '.'
else
    echo "❌ Session pool unhealthy"
    tail -20 /tmp/kiro-pool.log
    exit 1
fi

# Check memory
echo ""
echo "📊 System status:"
free -h | grep Mem
ps aux | grep -E 'kiro-wrapper|kiro-cli' | grep -v grep | wc -l | xargs echo "  Kiro processes:"

echo ""
echo "✅ Deployment complete!"
echo "   Session pool: http://localhost:8082"
echo "   Wrapper 1: http://localhost:9001"
echo "   Wrapper 2: http://localhost:9002"
