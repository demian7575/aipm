#!/bin/bash
# Real Behavior Tests - No Mocks, Test Actual Workflows

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🔴 Phase 1: Real Security & Data Safety Tests"

# Verify Test Parent exists
TEST_ROOT_ID=$(bash "$(dirname "$0")/create-test-root.sh")
if [[ -z "$TEST_ROOT_ID" ]]; then
  fail_test "Test Parent story not found"
  exit 1
fi
echo "📍 Using Test Parent ID: $TEST_ROOT_ID"

# Test 1: Front page loading test
echo "  🧪 Testing front page loading..."
PROD_FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/prod_frontend.html "$PROD_FRONTEND_URL")
DEV_FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/dev_frontend.html "$DEV_FRONTEND_URL")

if [[ "$PROD_FRONTEND_RESPONSE" == "200" ]] && grep -q "html" /tmp/prod_frontend.html; then
    pass_test "Production front page loads correctly"
else
    fail_test "Production front page loading failed - HTTP: $PROD_FRONTEND_RESPONSE"
fi

if [[ "$DEV_FRONTEND_RESPONSE" == "200" ]] && grep -q "html" /tmp/dev_frontend.html; then
    pass_test "Development front page loads correctly"
else
    fail_test "Development front page loading failed - HTTP: $DEV_FRONTEND_RESPONSE"
fi

# Cleanup temp files
rm -f /tmp/prod_frontend.html /tmp/dev_frontend.html

# Test 2: Create and delete test story
echo "  🧪 Testing real story create/delete workflow..."
TEST_STORY_PAYLOAD="{\"title\":\"Phase1 Test Story\",\"description\":\"Test story for Phase 1 gating tests\",\"storyPoint\":1,\"parentId\":$TEST_ROOT_ID,\"acceptWarnings\":true}"
CREATE_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$TEST_STORY_PAYLOAD")
TEST_STORY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [[ -n "$TEST_STORY_ID" ]]; then
    pass_test "Real story creation workflow (ID: $TEST_STORY_ID, Parent: $TEST_ROOT_ID)"
    
    # Clean up - delete the test story
    DELETE_RESPONSE=$(curl -s -X DELETE "$PROD_API_BASE/api/stories/$TEST_STORY_ID")
    if [[ $? -eq 0 ]]; then
        pass_test "Real story deletion cleanup completed"
    else
        fail_test "Real story deletion cleanup failed"
    fi
else
    fail_test "Real story creation failed"
fi

# Test 3: Verify existing stories for data consistency
echo "  🧪 Testing existing story data consistency..."
EXISTING_STORIES=$(curl -s "$PROD_API_BASE/api/stories")
EXISTING_COUNT=$(echo "$EXISTING_STORIES" | jq 'length')

if [[ "$EXISTING_COUNT" -gt 0 ]]; then
    SAMPLE_STORY=$(echo "$EXISTING_STORIES" | jq -r '.[0]')
    SAMPLE_ID=$(echo "$SAMPLE_STORY" | jq -r '.id')
    
    if [[ -n "$SAMPLE_ID" && "$SAMPLE_ID" != "null" ]]; then
        pass_test "Real story data access workflow (ID: $SAMPLE_ID)"
        
        # Verify story retrieval consistency
        RETRIEVED_STORY=$(curl -s "$PROD_API_BASE/api/stories/$SAMPLE_ID")
        RETRIEVED_TITLE=$(echo "$RETRIEVED_STORY" | jq -r '.title // empty')
        
        if [[ "$RETRIEVED_TITLE" == "$SAMPLE_TITLE" ]]; then
            pass_test "Real story data consistency verified"
        else
            fail_test "Real story data consistency failed"
        fi
    else
        fail_test "Real story workflow - invalid story data"
    fi
else
    fail_test "Real story workflow - no existing stories found"
fi

# Test 3: Test real draft generation with actual content validation
echo "  🧪 Testing real draft generation workflow..."
DRAFT_REQUEST='{"templateId":"user-story-generation","feature_description":"user authentication system","parentId":"1"}'
DRAFT_RESPONSE=$(curl -s -X POST "$PROD_API_BASE:8083/api/generate-draft" -H "Content-Type: application/json" -d "$DRAFT_REQUEST")

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
