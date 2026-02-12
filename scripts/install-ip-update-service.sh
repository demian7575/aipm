#!/bin/bash
# Install EC2 IP update service on EC2 instance
# Usage: ./install-ip-update-service.sh

set -e

echo "📦 Installing EC2 IP update service..."

# Copy script to system location
sudo cp scripts/update-ec2-ip-to-s3.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/update-ec2-ip-to-s3.sh

# Copy systemd service
sudo cp scripts/aipm-ip-update.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to run on boot
sudo systemctl enable aipm-ip-update.service

# Run once now to update current IP
sudo systemctl start aipm-ip-update.service

# Check status
sudo systemctl status aipm-ip-update.service --no-pager

echo "✅ IP update service installed and enabled"
echo "   Service will run automatically on every boot"
echo ""
echo "Commands:"
echo "  Check status: sudo systemctl status aipm-ip-update.service"
echo "  View logs:    sudo journalctl -u aipm-ip-update.service"
echo "  Run manually: sudo systemctl start aipm-ip-update.service"
