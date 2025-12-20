#!/bin/bash
# Setup Kiro API Server as systemd service

set -e

echo "🔧 Setting up Kiro API Server as systemd service..."

sudo tee /etc/systemd/system/kiro-api-server.service > /dev/null <<'EOF'
[Unit]
Description=Kiro API Server - REST interface for code generation
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/aipm
ExecStart=/usr/bin/node scripts/workers/kiro-api-server.js
Restart=always
RestartSec=10
StandardOutput=append:/tmp/kiro-api-server.log
StandardError=append:/tmp/kiro-api-server.log
Environment=NODE_ENV=production
Environment=REPO_PATH=/home/ec2-user/aipm
Environment=KIRO_API_PORT=8081
Environment=PATH=/home/ec2-user/.local/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created"

sudo systemctl daemon-reload
echo "✅ Systemd reloaded"

sudo systemctl enable kiro-api-server
echo "✅ Service enabled"

sudo systemctl start kiro-api-server
echo "✅ Service started"

sleep 3

if sudo systemctl is-active --quiet kiro-api-server; then
    echo "✅ Service is running"
    
    if curl -s http://localhost:8081/health | grep -q "running"; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed"
    fi
else
    echo "❌ Service failed to start"
    sudo systemctl status kiro-api-server
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Kiro API Server configured"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Endpoints:"
echo "  POST http://localhost:8081/execute"
echo "  GET  http://localhost:8081/health"
echo ""
echo "Usage:"
echo '  curl -X POST http://localhost:8081/execute \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"prompt": "Generate a function", "context": "Working on AIPM"}'"'"
echo ""
