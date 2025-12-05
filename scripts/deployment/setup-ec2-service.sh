#!/bin/bash
# Setup AIPM Terminal Server as systemd service on EC2

set -e

echo "🔧 Setting up AIPM Terminal Server as systemd service..."

# Create systemd service file
sudo tee /etc/systemd/system/aipm-terminal-server.service > /dev/null <<'EOF'
[Unit]
Description=AIPM Terminal Server - Worker Pool
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
ExecStart=/usr/bin/node scripts/workers/terminal-server.js
Restart=always
RestartSec=10
StandardOutput=append:/tmp/terminal-server.log
StandardError=append:/tmp/terminal-server.log
Environment=NODE_ENV=production
Environment=REPO_PATH=/home/ec2-user/aipm

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created"

# Reload systemd
sudo systemctl daemon-reload
echo "✅ Systemd reloaded"

# Enable service (start on boot)
sudo systemctl enable aipm-terminal-server
echo "✅ Service enabled (will start on boot)"

# Stop any existing terminal-server processes
pkill -f terminal-server || true
sleep 2

# Start service
sudo systemctl start aipm-terminal-server
echo "✅ Service started"

# Wait a moment for startup
sleep 5

# Check status
if sudo systemctl is-active --quiet aipm-terminal-server; then
    echo "✅ Service is running"
    
    # Test health endpoint
    if curl -s http://localhost:8080/health | grep -q "running"; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed"
    fi
else
    echo "❌ Service failed to start"
    sudo systemctl status aipm-terminal-server
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ AIPM Terminal Server configured as systemd service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status aipm-terminal-server   # Check status"
echo "  sudo systemctl restart aipm-terminal-server  # Restart"
echo "  sudo systemctl stop aipm-terminal-server     # Stop"
echo "  sudo journalctl -u aipm-terminal-server -f   # View logs"
echo "  tail -f /tmp/terminal-server.log             # View app logs"
echo ""
