#!/bin/bash
# Install and enable Kiro services as systemd services
# Run with: sudo ./scripts/utilities/install-kiro-services.sh

set -e

echo "🔧 Installing Kiro services..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Get the actual user (not root)
ACTUAL_USER="${SUDO_USER:-ec2-user}"
AIPM_DIR="/home/$ACTUAL_USER/aipm"

echo "📍 User: $ACTUAL_USER"
echo "📍 AIPM Directory: $AIPM_DIR"

# Verify directory exists
if [[ ! -d "$AIPM_DIR" ]]; then
    echo "❌ AIPM directory not found: $AIPM_DIR"
    exit 1
fi

# Stop existing services if running
echo "🛑 Stopping existing services..."
systemctl stop kiro-session-pool.service 2>/dev/null || true
systemctl stop semantic-api-server.service 2>/dev/null || true

# Copy service files
echo "📋 Installing service files..."
cp "$AIPM_DIR/config/kiro-session-pool.service" /etc/systemd/system/
cp "$AIPM_DIR/config/semantic-api-server.service" /etc/systemd/system/

# Update WorkingDirectory in service files
sed -i "s|/home/ec2-user/aipm|$AIPM_DIR|g" /etc/systemd/system/kiro-session-pool.service
sed -i "s|/home/ec2-user/aipm|$AIPM_DIR|g" /etc/systemd/system/semantic-api-server.service

# Update User in service files
sed -i "s|User=ec2-user|User=$ACTUAL_USER|g" /etc/systemd/system/kiro-session-pool.service
sed -i "s|User=ec2-user|User=$ACTUAL_USER|g" /etc/systemd/system/semantic-api-server.service

# Create log directory
mkdir -p /var/log
touch /var/log/kiro-session-pool.log
touch /var/log/kiro-session-pool-error.log
touch /var/log/semantic-api-server.log
touch /var/log/semantic-api-server-error.log
chown $ACTUAL_USER:$ACTUAL_USER /var/log/kiro-session-pool*.log
chown $ACTUAL_USER:$ACTUAL_USER /var/log/semantic-api-server*.log

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable services
echo "✅ Enabling services..."
systemctl enable kiro-session-pool.service
systemctl enable semantic-api-server.service

# Start services
echo "🚀 Starting services..."
systemctl start kiro-session-pool.service
sleep 3
systemctl start semantic-api-server.service

# Check status
echo ""
echo "📊 Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl status kiro-session-pool.service --no-pager -l
echo ""
systemctl status semantic-api-server.service --no-pager -l

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Useful commands:"
echo "  sudo systemctl status kiro-session-pool"
echo "  sudo systemctl status semantic-api-server"
echo "  sudo systemctl restart kiro-session-pool"
echo "  sudo systemctl restart semantic-api-server"
echo "  sudo journalctl -u kiro-session-pool -f"
echo "  sudo journalctl -u semantic-api-server -f"
echo "  tail -f /var/log/kiro-session-pool.log"
echo "  tail -f /var/log/semantic-api-server.log"
