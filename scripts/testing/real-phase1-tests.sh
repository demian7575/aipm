#!/bin/bash
# Real Behavior Tests - No Mocks, Test Actual Workflows

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🔴 Phase 1: Real Security & Data Safety Tests"

# Test 1: Front page loading test
echo "  🧪 Testing front page loading..."
PROD_FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/prod_frontend.html "$PROD_FRONTEND_URL")
DEV_FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/dev_frontend.html "$DEV_FRONTEND_URL")

if [[ "$PROD_FRONTEND_RESPONSE" == "200" ]] && grep -q "AIPM" /tmp/prod_frontend.html; then
    pass_test "Production front page loads correctly"
else
    fail_test "Production front page loading failed - HTTP: $PROD_FRONTEND_RESPONSE"
fi

if [[ "$DEV_FRONTEND_RESPONSE" == "200" ]] && grep -q "AIPM" /tmp/dev_frontend.html; then
    pass_test "Development front page loads correctly"
else
    fail_test "Development front page loading failed - HTTP: $DEV_FRONTEND_RESPONSE"
fi

# Cleanup temp files
rm -f /tmp/prod_frontend.html /tmp/dev_frontend.html

# Test 2: Create a real story and verify it's stored
echo "  🧪 Testing real story creation workflow..."
STORY_DATA='{"title":"Test Story","description":"Real test","asA":"user","iWant":"to test","soThat":"it works","storyPoint":1}'
CREATE_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$STORY_DATA")
STORY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [[ -n "$STORY_ID" && "$STORY_ID" != "null" ]]; then
    pass_test "Real story creation workflow"
    
    # Test 2: Verify the story can be retrieved
    RETRIEVED_STORY=$(curl -s "$PROD_API_BASE/api/stories/$STORY_ID")
    RETRIEVED_TITLE=$(echo "$RETRIEVED_STORY" | jq -r '.title // empty')
    
    if [[ "$RETRIEVED_TITLE" == "Test Story" ]]; then
        pass_test "Real story retrieval workflow"
        
        # Test 3: Update the story and verify changes
        UPDATE_DATA='{"title":"Updated Test Story","storyPoint":2}'
        curl -s -X PUT "$PROD_API_BASE/api/stories/$STORY_ID" -H "Content-Type: application/json" -d "$UPDATE_DATA" > /dev/null
        
        UPDATED_STORY=$(curl -s "$PROD_API_BASE/api/stories/$STORY_ID")
        UPDATED_TITLE=$(echo "$UPDATED_STORY" | jq -r '.title // empty')
        UPDATED_POINTS=$(echo "$UPDATED_STORY" | jq -r '.storyPoint // empty')
        
        if [[ "$UPDATED_TITLE" == "Updated Test Story" && "$UPDATED_POINTS" == "2" ]]; then
            pass_test "Real story update workflow"
        else
            fail_test "Real story update workflow - title: $UPDATED_TITLE, points: $UPDATED_POINTS"
        fi
        
        # Cleanup: Delete the test story
        curl -s -X DELETE "$PROD_API_BASE/api/stories/$STORY_ID" > /dev/null
        
    else
        fail_test "Real story retrieval workflow - got title: $RETRIEVED_TITLE"
    fi
else
    fail_test "Real story creation workflow - no ID returned"
fi

# Test 4: Test real draft generation with actual content validation
echo "  🧪 Testing real draft generation workflow..."
DRAFT_REQUEST='{"templateId":"user-story-generation","feature_description":"user authentication system","parentId":"1"}'
DRAFT_RESPONSE=$(curl -s -X POST "$PROD_API_BASE:8081/api/generate-draft" -H "Content-Type: application/json" -d "$DRAFT_REQUEST")

DRAFT_SUCCESS=$(echo "$DRAFT_RESPONSE" | jq -r '.success // false')
DRAFT_TITLE=$(echo "$DRAFT_RESPONSE" | jq -r '.draft.title // empty')
DRAFT_TESTS=$(echo "$DRAFT_RESPONSE" | jq -r '.draft.acceptanceTests | length // 0')

if [[ "$DRAFT_SUCCESS" == "true" && -n "$DRAFT_TITLE" && "$DRAFT_TESTS" -gt 0 ]]; then
    pass_test "Real draft generation with content validation"
else
    fail_test "Real draft generation - success: $DRAFT_SUCCESS, title: $DRAFT_TITLE, tests: $DRAFT_TESTS"
fi

# Test 5: Test data consistency between environments
echo "  🧪 Testing real data consistency..."
PROD_STORIES=$(curl -s "$PROD_API_BASE/api/stories" | jq 'length')
DEV_STORIES=$(curl -s "$DEV_API_BASE/api/stories" | jq 'length')

if [[ "$PROD_STORIES" -eq "$DEV_STORIES" && "$PROD_STORIES" -gt 0 ]]; then
    pass_test "Real data consistency between environments ($PROD_STORIES stories)"
else
    fail_test "Real data consistency - prod: $PROD_STORIES, dev: $DEV_STORIES"
fi

echo "✅ Phase 1 completed"
