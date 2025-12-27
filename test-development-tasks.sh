#!/bin/bash

echo "🧪 Testing AIPM Development Tasks Fix"
echo "====================================="

API_BASE="http://44.220.45.57:8081"

# Test 1: Create PR and verify storage
echo ""
echo "1️⃣ Testing CREATE PR with storage..."
CREATE_PR_RESPONSE=$(curl -s "$API_BASE/api/create-pr" -X POST -H "Content-Type: application/json" -d '{
  "storyId": 8,
  "branchName": "feature/auth-session-revocation",
  "prTitle": "Implement Session Revocation Webhooks",
  "prBody": "This PR implements session revocation webhooks for the authentication system.",
  "story": {"id": 8, "title": "AUTH-2.1: Session revocation webhooks"}
}')

PR_SUCCESS=$(echo "$CREATE_PR_RESPONSE" | jq -r '.success')
PR_ENTRY_NUMBER=$(echo "$CREATE_PR_RESPONSE" | jq -r '.prEntry.number')

if [ "$PR_SUCCESS" = "true" ] && [ "$PR_ENTRY_NUMBER" != "null" ]; then
  echo "✅ CREATE PR successful with prEntry (PR #$PR_ENTRY_NUMBER)"
else
  echo "❌ CREATE PR failed or missing prEntry"
  echo "Response: $CREATE_PR_RESPONSE"
  exit 1
fi

# Test 2: Verify PR is stored in story
echo ""
echo "2️⃣ Testing PR STORAGE in story..."
STORY_RESPONSE=$(curl -s "$API_BASE/api/stories/8")
PR_COUNT=$(echo "$STORY_RESPONSE" | jq '.prs | length')
STORED_PR_NUMBER=$(echo "$STORY_RESPONSE" | jq -r '.prs[0].number')

if [ "$PR_COUNT" -gt 0 ] && [ "$STORED_PR_NUMBER" = "$PR_ENTRY_NUMBER" ]; then
  echo "✅ PR stored in story ($PR_COUNT PRs found)"
  echo "   📋 PR Number: $STORED_PR_NUMBER"
else
  echo "❌ PR not properly stored in story"
  echo "Expected PR: $PR_ENTRY_NUMBER, Found: $STORED_PR_NUMBER"
  exit 1
fi

# Test 3: Test PR management endpoint
echo ""
echo "3️⃣ Testing PR MANAGEMENT endpoint..."
PR_MGMT_RESPONSE=$(curl -s "$API_BASE/api/stories/8/prs" -X POST -H "Content-Type: application/json" -d '{
  "prs": [
    {
      "number": 999,
      "title": "Test PR Management",
      "status": "open",
      "branchName": "feature/test-mgmt",
      "url": "https://github.com/test/pull/999"
    }
  ]
}')

MGMT_PR_COUNT=$(echo "$PR_MGMT_RESPONSE" | jq 'length')
if [ "$MGMT_PR_COUNT" = "1" ]; then
  echo "✅ PR management endpoint working"
else
  echo "❌ PR management endpoint failed"
  echo "Response: $PR_MGMT_RESPONSE"
  exit 1
fi

# Test 4: Test PR deletion
echo ""
echo "4️⃣ Testing PR DELETION..."
DELETE_RESPONSE=$(curl -s "$API_BASE/api/stories/8/prs/999" -X DELETE)
REMAINING_PRS=$(echo "$DELETE_RESPONSE" | jq 'length')

if [ "$REMAINING_PRS" = "0" ]; then
  echo "✅ PR deletion working (0 PRs remaining)"
else
  echo "❌ PR deletion failed"
  echo "Response: $DELETE_RESPONSE"
  exit 1
fi

# Test 5: Verify hierarchical stories show PRs
echo ""
echo "5️⃣ Testing HIERARCHICAL stories with PRs..."
HIERARCHICAL_STORIES=$(curl -s "$API_BASE/api/stories")
STORIES_WITH_PRS=$(echo "$HIERARCHICAL_STORIES" | jq '[.[] | select(.prs and (.prs | length > 0))] | length')

if [ "$STORIES_WITH_PRS" -gt 0 ]; then
  echo "✅ Found $STORIES_WITH_PRS stories with PRs in hierarchical structure"
  
  # Show example
  echo "📊 Example story with PRs:"
  echo "$HIERARCHICAL_STORIES" | jq -r '.[] | select(.prs and (.prs | length > 0)) | "   Story: " + .title + " (" + (.prs | length | tostring) + " PRs)"' | head -3
else
  echo "❌ No stories with PRs found in hierarchical structure"
  exit 1
fi

echo ""
echo "🎉 All Development Tasks tests passed!"
echo ""
echo "📊 Summary:"
echo "   ✅ CREATE PR stores prEntry in response"
echo "   ✅ PR data stored in story.prs array"
echo "   ✅ PR management endpoints working"
echo "   ✅ PR deletion working"
echo "   ✅ Hierarchical stories include PR data"
echo ""
echo "🚀 AIPM Development Tasks should now show PR cards!"
echo "🔗 Try it in the frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
