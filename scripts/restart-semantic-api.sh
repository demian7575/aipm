#!/bin/bash
set -e

# Restart Semantic API server
echo "🔄 Restarting Semantic API server..."
sudo systemctl restart kiro-semantic-api

# Wait for service to start
sleep 3

# Check status
echo "✅ Semantic API restarted"
sudo systemctl status kiro-semantic-api --no-pager | head -10
