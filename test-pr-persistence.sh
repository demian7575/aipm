#!/bin/bash
# Test that PRs persist after page refresh

API_URL="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"

echo "🧪 Testing PR Persistence"
echo "=========================="
echo ""

# 1. Get a story ID
echo "1️⃣  Fetching stories..."
STORIES=$(curl -s "$API_URL/api/stories")
STORY_ID=$(echo "$STORIES" | jq -r '.[0].id' 2>/dev/null)

if [ -z "$STORY_ID" ] || [ "$STORY_ID" = "null" ]; then
  echo "❌ No stories found"
  exit 1
fi

echo "✅ Using story ID: $STORY_ID"
echo ""

# 2. Add a test PR
echo "2️⃣  Adding test PR..."
TEST_PR='{
  "localId": "test-'$(date +%s)'",
  "number": 999,
  "prUrl": "https://github.com/test/test/pull/999",
  "taskTitle": "Test PR Persistence",
  "branchName": "test-branch",
  "repo": "test/test"
}'

ADD_RESPONSE=$(curl -s -X POST "$API_URL/api/stories/$STORY_ID/prs" \
  -H "Content-Type: application/json" \
  -d "$TEST_PR")

echo "Response: $ADD_RESPONSE" | jq '.' 2>/dev/null || echo "$ADD_RESPONSE"
echo ""

# 3. Fetch story again to verify PR is included
echo "3️⃣  Fetching stories again..."
STORIES_AFTER=$(curl -s "$API_URL/api/stories")
STORY_PRS=$(echo "$STORIES_AFTER" | jq -r ".[] | select(.id == $STORY_ID) | .prs" 2>/dev/null)

echo "Story PRs: $STORY_PRS"
echo ""

# 4. Check if PR exists
if echo "$STORY_PRS" | grep -q "999"; then
  echo "✅ PR persisted successfully!"
  echo ""
  echo "🎉 Fix verified: PRs now persist after page refresh"
else
  echo "❌ PR not found in story"
  echo ""
  echo "Story data:"
  echo "$STORIES_AFTER" | jq ".[] | select(.id == $STORY_ID)" 2>/dev/null
fi
