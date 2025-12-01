#!/bin/bash
# Test code generation flow end-to-end

API_URL="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"

echo "🧪 Testing Code Generation Flow"
echo "================================"
echo ""

# Test data
TASK_TITLE="Test Code Generation $(date +%s)"
OBJECTIVE="Add a test function to verify code generation works"
CONSTRAINTS="Keep it simple, just add a comment"
CRITERIA="Function should exist"

echo "📝 Creating PR with task..."
echo "   Title: $TASK_TITLE"
echo ""

# Call the API
RESPONSE=$(curl -s -X POST "$API_URL/api/personal-delegate" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskTitle\": \"$TASK_TITLE\",
    \"objective\": \"$OBJECTIVE\",
    \"constraints\": \"$CONSTRAINTS\",
    \"acceptanceCriteria\": [\"$CRITERIA\"],
    \"prTitle\": \"$TASK_TITLE\",
    \"owner\": \"demian7575\",
    \"repo\": \"aipm\",
    \"target\": \"pr\"
  }")

echo "📥 Backend Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract PR number and branch
PR_NUMBER=$(echo "$RESPONSE" | grep -o '"number":[0-9]*' | cut -d: -f2)
BRANCH=$(echo "$RESPONSE" | grep -o '"branchName":"[^"]*"' | cut -d'"' -f4)

if [ -n "$PR_NUMBER" ]; then
  echo "✅ PR Created: #$PR_NUMBER"
  echo "🌿 Branch: $BRANCH"
  echo ""
  echo "⏳ Waiting 35 seconds for code generation..."
  sleep 35
  echo ""
  echo "📊 Check results:"
  echo "   PR: https://github.com/demian7575/aipm/pull/$PR_NUMBER"
  echo "   EC2 Logs: ssh ec2-user@44.220.45.57 'tail -50 /home/ec2-user/aipm/scripts/workers/terminal-server.log'"
else
  echo "❌ Failed to create PR"
fi
