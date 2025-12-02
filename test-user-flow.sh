#!/usr/bin/env bash
# Test end-to-end user flow for code generation

echo "🔍 Testing End-to-End User Flow"
echo "================================"
echo ""

# Step 1: Load stories
echo "📊 Step 1: Load Stories"
START=$(date +%s%3N)
STORIES=$(curl -s https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories)
END=$(date +%s%3N)
LOAD_TIME=$((END - START))
STORY_COUNT=$(echo "$STORIES" | jq '. | length')
echo "✅ Loaded $STORY_COUNT stories in ${LOAD_TIME}ms"
echo ""

# Step 2: Create PR via personal-delegate
echo "📊 Step 2: Create PR (personal-delegate)"
START=$(date +%s%3N)

STORY_ID=$(echo "$STORIES" | jq -r '.[0].id')
BRANCH_NAME="test-flow-$(date +%s)"

PR_RESPONSE=$(curl -s -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d '{
    "storyId": '$STORY_ID',
    "storyTitle": "Test Story",
    "repositoryApiUrl": "https://api.github.com",
    "owner": "demian7575",
    "repo": "aipm",
    "target": "pr",
    "branchName": "'$BRANCH_NAME'",
    "taskTitle": "Test bottleneck investigation",
    "objective": "Add a test comment to README",
    "prTitle": "Test: Bottleneck Investigation",
    "constraints": "Minimal changes only",
    "acceptanceCriteria": ["Comment added to README"]
  }')

END=$(date +%s%3N)
PR_TIME=$((END - START))

echo "Response:"
echo "$PR_RESPONSE" | jq '.'
echo "✅ PR created in ${PR_TIME}ms"
echo ""

# Step 3: Check if EC2 received the request
echo "📊 Step 3: Check EC2 Logs for Code Generation"
sleep 2
ssh ec2-user@44.220.45.57 'tail -50 ~/aipm/scripts/workers/terminal-server.log' | grep -A 5 "Generating code" | tail -20
echo ""

# Summary
echo "================================"
echo "📊 TIMING SUMMARY"
echo "================================"
echo "Load stories:       ${LOAD_TIME}ms"
echo "Create PR:          ${PR_TIME}ms"
echo ""

if [ $PR_TIME -gt 5000 ]; then
  echo "⚠️  BOTTLENECK: PR creation is slow (${PR_TIME}ms > 5s)"
  echo "   This includes:"
  echo "   - GitHub API calls (create branch, create PR)"
  echo "   - EC2 code generation trigger (fire-and-forget)"
elif [ $LOAD_TIME -gt 2000 ]; then
  echo "⚠️  BOTTLENECK: Story loading is slow (${LOAD_TIME}ms > 2s)"
else
  echo "✅ User flow is responsive"
fi
