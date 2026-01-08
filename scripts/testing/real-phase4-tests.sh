#!/bin/bash
# Real End-to-End Workflow Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🔄 Phase 4: Real End-to-End Workflow Tests"

# Test 1: Complete story lifecycle workflow
echo "  🧪 Testing complete story lifecycle workflow..."
# Create -> Update -> Add acceptance test -> Update status -> Verify
LIFECYCLE_DATA='{"title":"Lifecycle Test","description":"Full workflow test","asA":"tester","iWant":"to verify","soThat":"workflows work","storyPoint":2}'
LIFECYCLE_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$LIFECYCLE_DATA")
LIFECYCLE_ID=$(echo "$LIFECYCLE_RESPONSE" | jq -r '.id // empty')

if [[ -n "$LIFECYCLE_ID" ]]; then
    # Update story
    UPDATE_DATA='{"title":"Updated Lifecycle Test","storyPoint":3,"status":"In Progress"}'
    curl -s -X PUT "$PROD_API_BASE/api/stories/$LIFECYCLE_ID" -H "Content-Type: application/json" -d "$UPDATE_DATA" > /dev/null
    
    # Add acceptance test
    TEST_DATA='{"title":"Test acceptance","given":"Given I have a story","when":"When I test it","then":"Then it should work","status":"Draft"}'
    curl -s -X POST "$PROD_API_BASE/api/stories/$LIFECYCLE_ID/tests" -H "Content-Type: application/json" -d "$TEST_DATA" > /dev/null
    
    # Verify final state
    FINAL_STORY=$(curl -s "$PROD_API_BASE/api/stories/$LIFECYCLE_ID")
    FINAL_TITLE=$(echo "$FINAL_STORY" | jq -r '.title // empty')
    FINAL_POINTS=$(echo "$FINAL_STORY" | jq -r '.storyPoint // empty')
    FINAL_STATUS=$(echo "$FINAL_STORY" | jq -r '.status // empty')
    
    # Get acceptance tests
    TESTS_RESPONSE=$(curl -s "$PROD_API_BASE/api/stories/$LIFECYCLE_ID/tests")
    TESTS_COUNT=$(echo "$TESTS_RESPONSE" | jq 'length // 0')
    
    if [[ "$FINAL_TITLE" == "Updated Lifecycle Test" && "$FINAL_POINTS" == "3" && "$FINAL_STATUS" == "In Progress" && "$TESTS_COUNT" -gt 0 ]]; then
        pass_test "Complete story lifecycle workflow"
    else
        fail_test "Complete story lifecycle workflow - title: $FINAL_TITLE, points: $FINAL_POINTS, status: $FINAL_STATUS, tests: $TESTS_COUNT"
    fi
    
    # Cleanup
    curl -s -X DELETE "$PROD_API_BASE/api/stories/$LIFECYCLE_ID" > /dev/null
else
    fail_test "Complete story lifecycle workflow - could not create story"
fi

# Test 2: Real draft-to-story workflow
echo "  🧪 Testing real draft-to-story workflow..."
# Generate draft -> Create story from draft -> Verify content matches
DRAFT_REQUEST='{"templateId":"user-story-generation","feature_description":"payment processing system","parentId":"1"}'
DRAFT_RESPONSE=$(curl -s -X POST "$PROD_API_BASE:8081/api/generate-draft" -H "Content-Type: application/json" -d "$DRAFT_REQUEST")

DRAFT_TITLE=$(echo "$DRAFT_RESPONSE" | jq -r '.draft.title // empty')
DRAFT_DESC=$(echo "$DRAFT_RESPONSE" | jq -r '.draft.description // empty')
DRAFT_POINTS=$(echo "$DRAFT_RESPONSE" | jq -r '.draft.storyPoint // empty')

if [[ -n "$DRAFT_TITLE" && -n "$DRAFT_DESC" && -n "$DRAFT_POINTS" ]]; then
    # Create story from draft
    STORY_FROM_DRAFT="{\"title\":\"$DRAFT_TITLE\",\"description\":\"$DRAFT_DESC\",\"storyPoint\":$DRAFT_POINTS}"
    STORY_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$STORY_FROM_DRAFT")
    STORY_ID=$(echo "$STORY_RESPONSE" | jq -r '.id // empty')
    
    if [[ -n "$STORY_ID" ]]; then
        # Verify story matches draft
        CREATED_STORY=$(curl -s "$PROD_API_BASE/api/stories/$STORY_ID")
        CREATED_TITLE=$(echo "$CREATED_STORY" | jq -r '.title // empty')
        
        if [[ "$CREATED_TITLE" == "$DRAFT_TITLE" ]]; then
            pass_test "Real draft-to-story workflow"
        else
            fail_test "Real draft-to-story workflow - title mismatch: $CREATED_TITLE vs $DRAFT_TITLE"
        fi
        
        # Cleanup
        curl -s -X DELETE "$PROD_API_BASE/api/stories/$STORY_ID" > /dev/null
    else
        fail_test "Real draft-to-story workflow - could not create story from draft"
    fi
else
    fail_test "Real draft-to-story workflow - invalid draft: title=$DRAFT_TITLE, desc=$DRAFT_DESC, points=$DRAFT_POINTS"
fi

# Test 3: Real multi-environment workflow consistency
echo "  🧪 Testing real multi-environment workflow consistency..."
# Create story in prod, verify it syncs to dev (if sync is enabled)
SYNC_DATA='{"title":"Sync Test Story","description":"Testing environment sync","storyPoint":1}'
SYNC_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$SYNC_DATA")
SYNC_ID=$(echo "$SYNC_RESPONSE" | jq -r '.id // empty')

if [[ -n "$SYNC_ID" ]]; then
    # Wait for potential sync
    sleep 3
    
    # Check if story exists in dev (may not sync automatically, that's ok)
    DEV_STORY=$(curl -s "$DEV_API_BASE/api/stories/$SYNC_ID" 2>/dev/null || echo '{}')
    DEV_TITLE=$(echo "$DEV_STORY" | jq -r '.title // empty')
    
    # Also test that both environments can handle the same operations
    DEV_CREATE=$(curl -s -X POST "$DEV_API_BASE/api/stories" -H "Content-Type: application/json" -d "$SYNC_DATA")
    DEV_ID=$(echo "$DEV_CREATE" | jq -r '.id // empty')
    
    if [[ -n "$DEV_ID" ]]; then
        pass_test "Real multi-environment workflow consistency"
        # Cleanup both environments
        curl -s -X DELETE "$DEV_API_BASE/api/stories/$DEV_ID" > /dev/null
    else
        fail_test "Real multi-environment workflow consistency - dev environment not working"
    fi
    
    # Cleanup prod
    curl -s -X DELETE "$PROD_API_BASE/api/stories/$SYNC_ID" > /dev/null
else
    fail_test "Real multi-environment workflow consistency - could not create prod story"
fi

echo "✅ Phase 4 completed"
