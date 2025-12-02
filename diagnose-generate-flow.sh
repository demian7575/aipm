#!/bin/bash
# Diagnose the "Generate Code & PR" flow without creating PRs

echo "🔍 Diagnosing Generate Code & PR Flow"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

ERRORS=0

# 1. EC2 Terminal Server
echo "1️⃣  EC2 Terminal Server (http://44.220.45.57:8080)"
EC2_RESPONSE=$(curl -s -m 5 http://44.220.45.57:8080/health 2>&1)
if echo "$EC2_RESPONSE" | grep -q '"status":"running"'; then
  pass "Server is running"
  KIRO_PID=$(echo "$EC2_RESPONSE" | grep -o '"pid":[0-9]*' | cut -d':' -f2)
  echo "   Kiro PID: $KIRO_PID"
else
  fail "Server not responding"
  echo "   Response: $EC2_RESPONSE"
  ((ERRORS++))
fi
echo ""

# 2. Kiro CLI on EC2
echo "2️⃣  Kiro CLI Installation"
KIRO_PATH=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@44.220.45.57 "which kiro-cli" 2>&1)
if [ $? -eq 0 ]; then
  pass "Kiro CLI found: $KIRO_PATH"
else
  fail "Kiro CLI not found"
  echo "   Error: $KIRO_PATH"
  ((ERRORS++))
fi
echo ""

# 3. Repository on EC2
echo "3️⃣  AIPM Repository on EC2"
REPO_CHECK=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@44.220.45.57 "ls -d /home/ec2-user/aipm 2>&1")
if [ $? -eq 0 ]; then
  pass "Repository exists: /home/ec2-user/aipm"
  BRANCH=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "cd /home/ec2-user/aipm && git branch --show-current" 2>&1)
  echo "   Current branch: $BRANCH"
else
  fail "Repository not found"
  ((ERRORS++))
fi
echo ""

# 4. GitHub Token
echo "4️⃣  GitHub Token Configuration"
if [ -z "$GITHUB_TOKEN" ]; then
  fail "GITHUB_TOKEN not set in environment"
  echo "   Run: export GITHUB_TOKEN=your_token"
  ((ERRORS++))
else
  pass "GITHUB_TOKEN is set"
  # Test token validity
  TOKEN_TEST=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user 2>&1)
  if echo "$TOKEN_TEST" | grep -q '"login"'; then
    USER=$(echo "$TOKEN_TEST" | grep -o '"login":"[^"]*"' | cut -d'"' -f4)
    pass "Token is valid (user: $USER)"
  else
    fail "Token is invalid or expired"
    ((ERRORS++))
  fi
fi
echo ""

# 5. Backend API
echo "5️⃣  Backend API"
API_URL="${API_URL:-https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod}"
API_RESPONSE=$(curl -s -m 5 "$API_URL/api/health" 2>&1)
if echo "$API_RESPONSE" | grep -q '"status":"healthy"'; then
  pass "Backend API is healthy"
  echo "   URL: $API_URL"
else
  warn "Backend API not responding as expected"
  echo "   Response: $API_RESPONSE"
fi
echo ""

# 6. Frontend Config
echo "6️⃣  Frontend Configuration"
if [ -f "apps/frontend/public/config.js" ]; then
  pass "config.js exists"
  API_ENDPOINT=$(grep -o 'https://[^"]*' apps/frontend/public/config.js | head -1)
  echo "   API endpoint: $API_ENDPOINT"
else
  fail "config.js not found"
  ((ERRORS++))
fi
echo ""

# 7. Terminal Server Logs
echo "7️⃣  Recent Terminal Server Activity"
RECENT_LOGS=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@44.220.45.57 "tail -10 /home/ec2-user/aipm/scripts/workers/terminal-server.log 2>&1")
if [ $? -eq 0 ]; then
  echo "$RECENT_LOGS" | head -5
  if echo "$RECENT_LOGS" | grep -q "Kiro CLI started"; then
    pass "Kiro session is active"
  else
    warn "No recent Kiro activity"
  fi
else
  warn "Could not read logs"
fi
echo ""

# Summary
echo "======================================"
if [ $ERRORS -eq 0 ]; then
  pass "All critical checks passed!"
  echo ""
  echo "✨ The Generate Code & PR flow should work correctly."
  echo ""
  echo "To test it:"
  echo "1. Open AIPM: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
  echo "2. Select a story"
  echo "3. Click 'Generate Code & PR'"
  echo "4. Fill in the form and submit"
  echo "5. Monitor: ssh ec2-user@44.220.45.57 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'"
else
  fail "$ERRORS critical issue(s) found"
  echo ""
  echo "Fix the issues above before using Generate Code & PR."
fi
