#!/bin/bash
# Simple test of Generate Code & PR flow (creates a real PR!)

set -e

echo "🧪 Testing Generate Code & PR Flow"
echo "===================================="
echo ""
echo "⚠️  WARNING: This will create a REAL pull request!"
echo "   Press Ctrl+C within 5 seconds to cancel..."
sleep 5
echo ""

# Check prerequisites
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set"
  echo "   Run: export GITHUB_TOKEN=your_token"
  exit 1
fi

# Generate unique branch name
TIMESTAMP=$(date +%s)
BRANCH="test/generate-code-flow-$TIMESTAMP"

echo "📋 Test Configuration:"
echo "   Branch: $BRANCH"
echo "   Owner: demian7575"
echo "   Repo: aipm"
echo ""

# Create test payload
PAYLOAD=$(cat <<EOF
{
  "storyId": 999,
  "storyTitle": "Test Generate Code Flow",
  "repositoryApiUrl": "https://api.github.com",
  "owner": "demian7575",
  "repo": "aipm",
  "target": "pr",
  "branchName": "$BRANCH",
  "taskTitle": "Test Code Generation",
  "objective": "Create a simple test file to verify code generation works",
  "prTitle": "Test: Verify Generate Code Flow",
  "constraints": "Create only a single test file",
  "acceptanceCriteria": [
    "File test-generated.txt is created",
    "File contains timestamp and test message"
  ]
}
EOF
)

echo "📤 Sending delegation request..."
API_URL="${API_URL:-https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod}"

RESPONSE=$(curl -s -X POST "$API_URL/api/personal-delegate" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo ""
echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract PR URL
PR_URL=$(echo "$RESPONSE" | grep -o '"html_url":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PR_URL" ]; then
  echo "✅ PR Created Successfully!"
  echo "   URL: $PR_URL"
  echo ""
  echo "🤖 Kiro CLI is now generating code on EC2..."
  echo "   This will take 2-10 minutes"
  echo ""
  echo "📊 Monitor progress:"
  echo "   ssh ec2-user@44.220.45.57 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'"
  echo ""
  echo "🔍 Check PR for updates:"
  echo "   $PR_URL"
  echo ""
  echo "✨ When complete, review and merge the PR"
else
  echo "❌ Failed to create PR"
  echo "   Check the response above for errors"
  exit 1
fi
