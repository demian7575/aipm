#!/bin/bash
# Check and restart terminal server if needed

echo "🔍 Checking Terminal Server Status"
echo "===================================="
echo ""

# Check if server is accessible
if curl -s --max-time 5 http://44.220.45.57:8080/health > /dev/null 2>&1; then
  echo "✅ Terminal server is running"
  HEALTH=$(curl -s http://44.220.45.57:8080/health)
  echo "   Status: $(echo $HEALTH | jq -r '.status')"
  echo "   Kiro PID: $(echo $HEALTH | jq -r '.kiro.pid')"
  echo "   Kiro Running: $(echo $HEALTH | jq -r '.kiro.running')"
else
  echo "❌ Terminal server is NOT accessible"
  echo ""
  echo "🔄 Attempting to restart..."
  ./scripts/workers/start-kiro-terminal.sh
  
  echo ""
  echo "⏳ Waiting 5 seconds..."
  sleep 5
  
  if curl -s --max-time 5 http://44.220.45.57:8080/health > /dev/null 2>&1; then
    echo "✅ Terminal server restarted successfully"
  else
    echo "❌ Failed to restart terminal server"
    echo ""
    echo "Manual steps:"
    echo "  1. SSH to EC2: ssh ec2-user@44.220.45.57"
    echo "  2. Check logs: tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log"
    echo "  3. Restart: cd /home/ec2-user/aipm/scripts/workers && node terminal-server.js"
    exit 1
  fi
fi

echo ""
echo "===================================="
echo "✅ Terminal server is healthy"
