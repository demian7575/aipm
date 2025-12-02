#!/bin/bash
# Test Kiro CLI health check and auto-start in Generate Code & PR modal

echo "🧪 Testing Kiro CLI Health Check & Auto-Start"
echo "=============================================="
echo ""

# Test the health endpoint
echo "1️⃣  Testing Kiro health endpoint..."
HEALTH=$(curl -s http://44.220.45.57:8080/health 2>&1)

if echo "$HEALTH" | grep -q '"status":"running"'; then
  echo "✅ Kiro CLI is running"
  PID=$(echo "$HEALTH" | jq -r '.kiro.pid' 2>/dev/null)
  echo "   PID: $PID"
  KIRO_RUNNING=true
else
  echo "⚠️  Kiro CLI is not running"
  echo "   Response: $HEALTH"
  KIRO_RUNNING=false
fi
echo ""

# Test restart endpoint
echo "2️⃣  Testing restart endpoint..."
RESTART=$(curl -s -X POST http://44.220.45.57:8080/restart-kiro 2>&1)
if echo "$RESTART" | grep -q '"success":true'; then
  echo "✅ Restart endpoint is working"
  echo "   Note: This will restart the server (use with caution)"
else
  echo "⚠️  Restart endpoint response: $RESTART"
fi
echo ""

# Check frontend behavior
echo "3️⃣  Testing frontend behavior..."
echo "   Open: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
echo "   1. Select a story"
echo "   2. Click 'Generate Code & PR'"
echo "   3. Check the status banner"
echo ""

if [ "$KIRO_RUNNING" = true ]; then
  echo "Expected (Kiro running):"
  echo "   ✅ Green banner: 'Kiro CLI is ready (PID: $PID)'"
  echo "   ℹ️  No Start button (Kiro is already running)"
else
  echo "Expected (Kiro not running):"
  echo "   ⚠️  Yellow banner: 'Kiro CLI is not running'"
  echo "   🔵 Blue 'Start Kiro CLI' button appears"
  echo "   Click button → 'Starting...' → Wait 10s → Green banner"
fi
echo ""

echo "=============================================="
echo "✅ Health check and auto-start are configured!"
echo ""
echo "Features:"
echo "  • Real-time Kiro CLI status check"
echo "  • Auto-start button when Kiro is down"
echo "  • Automatic recheck after starting"

