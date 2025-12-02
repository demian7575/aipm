#!/bin/bash
# Test the complete "Generate Code & PR" flow

set -e

echo "🧪 Testing Generate Code & PR Flow"
echo "=================================="
echo ""

# 1. Check EC2 terminal server is running
echo "1️⃣  Checking EC2 terminal server..."
EC2_HEALTH=$(curl -s http://44.220.45.57:8080/health)
if echo "$EC2_HEALTH" | grep -q '"status":"running"'; then
  echo "✅ EC2 terminal server is running"
  echo "   $EC2_HEALTH"
else
  echo "❌ EC2 terminal server is NOT running"
  echo "   Response: $EC2_HEALTH"
  exit 1
fi
echo ""

# 2. Check Kiro CLI is available on EC2
echo "2️⃣  Checking Kiro CLI on EC2..."
KIRO_CHECK=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "which kiro-cli" 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ Kiro CLI found: $KIRO_CHECK"
else
  echo "❌ Kiro CLI not found on EC2"
  exit 1
fi
echo ""

# 3. Check GitHub token is configured
echo "3️⃣  Checking GitHub token..."
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set"
  echo "   Run: export GITHUB_TOKEN=your_token"
  exit 1
else
  echo "✅ GITHUB_TOKEN is set"
fi
echo ""

# 4. Check backend API is accessible
echo "4️⃣  Checking backend API..."
API_URL="${API_URL:-https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod}"
API_HEALTH=$(curl -s "$API_URL/api/health" 2>&1)
if echo "$API_HEALTH" | grep -q '"status":"healthy"'; then
  echo "✅ Backend API is healthy"
else
  echo "⚠️  Backend API response: $API_HEALTH"
fi
echo ""

# 5. Test the delegation endpoint (dry run)
echo "5️⃣  Testing delegation endpoint..."
TEST_PAYLOAD='{
  "storyId": 999,
  "storyTitle": "Test Story",
  "repositoryApiUrl": "https://api.github.com",
  "owner": "demian7575",
  "repo": "aipm",
  "target": "pr",
  "branchName": "test-flow",
  "taskTitle": "Test Generate Code Flow",
  "objective": "Verify the code generation workflow works end-to-end",
  "prTitle": "Test: Code Generation Flow",
  "constraints": "Minimal changes only",
  "acceptanceCriteria": ["Flow completes successfully", "PR is created"]
}'

echo "📤 Sending test delegation request..."
echo "   (This will create a real PR - cancel with Ctrl+C if you don't want this)"
sleep 3

DELEGATE_RESPONSE=$(curl -s -X POST "$API_URL/api/personal-delegate" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" 2>&1)

if echo "$DELEGATE_RESPONSE" | grep -q '"html_url"'; then
  echo "✅ Delegation successful!"
  PR_URL=$(echo "$DELEGATE_RESPONSE" | grep -o '"html_url":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   PR created: $PR_URL"
  echo ""
  echo "🤖 Kiro CLI should now be generating code on EC2..."
  echo "   Monitor progress: ssh ec2-user@44.220.45.57 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'"
else
  echo "❌ Delegation failed"
  echo "   Response: $DELEGATE_RESPONSE"
  exit 1
fi
echo ""

echo "=================================="
echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "1. Wait 2-5 minutes for Kiro to generate code"
echo "2. Check PR: $PR_URL"
echo "3. Review generated code"
echo "4. Merge or close PR"
