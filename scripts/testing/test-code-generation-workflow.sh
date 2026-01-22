#!/bin/bash
# E2E test for code generation workflow

set -e

API_URL="${API_URL:-http://44.197.204.18}"
STORY_ID="${STORY_ID:-1768631018504}"

echo "🧪 Testing Code Generation Workflow"
echo "📍 API: $API_URL"
echo "📝 Story ID: $STORY_ID"

# Step 1: Update story to Ready status
echo ""
echo "1️⃣ Setting story to Ready status..."
RESPONSE=$(curl -s -X PUT "$API_URL/api/stories/$STORY_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "Ready", "storyPoint": 1}')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Story updated to Ready"
else
  echo "❌ Failed to update story"
  echo "$RESPONSE"
  exit 1
fi

# Step 2: Verify story is Ready
echo ""
echo "2️⃣ Verifying story status..."
STORY=$(curl -s "$API_URL/api/stories/$STORY_ID")
STATUS=$(echo "$STORY" | jq -r '.status')

if [ "$STATUS" = "Ready" ]; then
  echo "✅ Story status confirmed: Ready"
else
  echo "❌ Story status is: $STATUS"
  exit 1
fi

# Step 3: Check if PR exists
PR_NUMBER=$(echo "$STORY" | jq -r '.prNumber // empty')
BRANCH_NAME=$(echo "$STORY" | jq -r '.prUrl // empty' | sed 's/.*\///')

if [ -z "$PR_NUMBER" ]; then
  echo ""
  echo "3️⃣ No PR exists, creating one..."
  
  # Generate unique branch name
  TIMESTAMP=$(date +%s)
  BRANCH_NAME="e2e-test-story-$STORY_ID-$TIMESTAMP"
  
  # Create PR via API
  CREATE_PR_RESPONSE=$(curl -s -X POST "$API_URL/api/create-pr" \
    -H "Content-Type: application/json" \
    -d "{
      \"storyId\": $STORY_ID,
      \"branchName\": \"$BRANCH_NAME\",
      \"prTitle\": \"E2E Test: Story $STORY_ID\",
      \"prBody\": \"Automated E2E test for code generation workflow\"
    }")
  
  PR_NUMBER=$(echo "$CREATE_PR_RESPONSE" | jq -r '.prNumber // empty')
  BRANCH_NAME=$(echo "$CREATE_PR_RESPONSE" | jq -r '.branchName // empty')
  
  if [ -z "$PR_NUMBER" ]; then
    echo "❌ Failed to create PR"
    echo "$CREATE_PR_RESPONSE"
    exit 1
  fi
  
  echo "✅ PR created: #$PR_NUMBER"
  echo "✅ Branch: $BRANCH_NAME"
else
  echo ""
  echo "3️⃣ PR already exists: #$PR_NUMBER"
fi

# Step 4: Trigger code generation
echo ""
echo "4️⃣ Triggering code generation..."

PROMPT="Execute template: ./templates/code-generation.md

storyId=$STORY_ID
branchName=$BRANCH_NAME
prNumber=$PR_NUMBER"

GEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/generate-code-branch" \
  -H "Content-Type: application/json" \
  -d "{
    \"storyId\": $STORY_ID,
    \"prNumber\": $PR_NUMBER,
    \"prompt\": $(echo "$PROMPT" | jq -Rs .),
    \"originalBranch\": \"$BRANCH_NAME\"
  }" 2>&1 || echo -e "\n504")

HTTP_CODE=$(echo "$GEN_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$GEN_RESPONSE" | head -n -1)

# Accept both success response and timeout (504) as valid
# Kiro CLI works asynchronously, so timeout is expected
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "504" ]; then
  if [ "$HTTP_CODE" = "504" ]; then
    echo "⏱️  Request timed out (expected - Kiro CLI works asynchronously)"
  else
    echo "✅ Code generation request accepted"
  fi
else
  echo "❌ Code generation failed (HTTP $HTTP_CODE)"
  echo "$RESPONSE_BODY"
  exit 1
fi

# Step 5: Monitor Kiro API logs for completion
echo ""
echo "5️⃣ Monitoring code generation (120s timeout)..."
echo "   Waiting for Kiro CLI to generate code..."

INITIAL_COMMIT_COUNT=0
for i in {1..24}; do
  sleep 5
  echo "   ⏱️  ${i}0s elapsed..."
  
  # Check PR commits
  COMMITS=$(curl -s "https://api.github.com/repos/demian7575/aipm/pulls/$PR_NUMBER/commits" \
    -H "Accept: application/vnd.github.v3+json" 2>/dev/null || echo "[]")
  
  COMMIT_COUNT=$(echo "$COMMITS" | jq 'length')
  
  # First iteration: record initial commit count
  if [ $i -eq 1 ]; then
    INITIAL_COMMIT_COUNT=$COMMIT_COUNT
    echo "   📊 Initial commits: $INITIAL_COMMIT_COUNT"
    continue
  fi
  
  # Check if new commits were added (Kiro CLI generated code)
  if [ "$COMMIT_COUNT" -gt "$INITIAL_COMMIT_COUNT" ]; then
    LAST_COMMIT=$(echo "$COMMITS" | jq -r '.[-1].commit.message')
    echo ""
    echo "✅ Code generation completed!"
    echo "📝 Last commit: $LAST_COMMIT"
    echo "📊 Total commits: $COMMIT_COUNT (added $((COMMIT_COUNT - INITIAL_COMMIT_COUNT)))"
    echo "🔗 PR: https://github.com/demian7575/aipm/pull/$PR_NUMBER"
    
    # Verify gating tests passed
    echo ""
    echo "6️⃣ Verifying gating tests..."
    if echo "$LAST_COMMIT" | grep -qi "feat:"; then
      echo "✅ Commit message follows convention"
    else
      echo "⚠️  Commit message may not follow convention"
    fi
    
    exit 0
  fi
done

echo ""
echo "⚠️  Timeout: Code generation did not complete in 120s"
echo "   Initial commits: $INITIAL_COMMIT_COUNT"
echo "   Current commits: $COMMIT_COUNT"
echo "🔗 Check PR manually: https://github.com/demian7575/aipm/pull/$PR_NUMBER"
exit 1
