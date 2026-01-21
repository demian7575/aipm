#!/bin/bash
# Real Performance & API Workflow Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🟡 Phase 2: Real Performance & API Workflow Tests"

# Get Test Root
TEST_ROOT_ID=$(bash "$(dirname "$0")/create-test-root.sh")
echo "📍 Using Test Parent ID: $TEST_ROOT_ID"

# Test 1: Real performance test with actual story operations
echo "  🧪 Testing real API performance under load..."
START_TIME=$(date +%s.%N)

# Create 5 stories and measure time
CREATED_IDS=()
for i in {1..5}; do
    STORY_DATA="{\"title\":\"Perf Test $i\",\"description\":\"Performance test story\",\"storyPoint\":1,\"parentId\":$TEST_ROOT_ID,\"acceptWarnings\":true}"
    RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$STORY_DATA")
    STORY_ID=$(echo "$RESPONSE" | jq -r '.id // empty')
    if [[ -n "$STORY_ID" ]]; then
        CREATED_IDS+=("$STORY_ID")
    fi
done

END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)
AVG_TIME=$(echo "scale=3; $DURATION / 5" | bc)

if (( $(echo "$AVG_TIME < 2.0" | bc -l) )); then
    pass_test "Real API performance test (${AVG_TIME}s avg per story)"
else
    fail_test "Real API performance test (${AVG_TIME}s avg per story - too slow)"
fi

# Cleanup performance test stories
for story_id in "${CREATED_IDS[@]}"; do
    curl -s -X DELETE "$PROD_API_BASE/api/stories/$story_id" > /dev/null
done

# Test 2: Real concurrent draft generation
echo "  🧪 Testing real concurrent draft generation..."
DRAFT_REQUEST='{"templateId":"user-story-generation","feature_description":"concurrent test","parentId":"1"}'

# Start 3 concurrent draft generations
curl -s -X POST "$PROD_API_BASE:8083/api/generate-draft" -H "Content-Type: application/json" -d "$DRAFT_REQUEST" > /tmp/draft1.json &
curl -s -X POST "$PROD_API_BASE:8083/api/generate-draft" -H "Content-Type: application/json" -d "$DRAFT_REQUEST" > /tmp/draft2.json &
curl -s -X POST "$PROD_API_BASE:8083/api/generate-draft" -H "Content-Type: application/json" -d "$DRAFT_REQUEST" > /tmp/draft3.json &

wait

# Check all succeeded
SUCCESS1=$(jq -r '.success // false' /tmp/draft1.json)
SUCCESS2=$(jq -r '.success // false' /tmp/draft2.json)
SUCCESS3=$(jq -r '.success // false' /tmp/draft3.json)

if [[ "$SUCCESS1" == "true" && "$SUCCESS2" == "true" && "$SUCCESS3" == "true" ]]; then
    pass_test "Real concurrent draft generation"
else
    fail_test "Real concurrent draft generation - results: $SUCCESS1, $SUCCESS2, $SUCCESS3"
fi

# Cleanup temp files
rm -f /tmp/draft*.json

# Test 3: Real API contract validation with actual data
echo "  🧪 Testing real API contract validation..."
STORY_RESPONSE=$(curl -s "$PROD_API_BASE/api/stories" | jq '.[0] // {}')

# Check required fields exist in real data
REQUIRED_FIELDS=("id" "title" "description" "storyPoint" "status")
MISSING_FIELDS=()

for field in "${REQUIRED_FIELDS[@]}"; do
    if [[ $(echo "$STORY_RESPONSE" | jq "has(\"$field\")") != "true" ]]; then
        MISSING_FIELDS+=("$field")
    fi
done

if [[ ${#MISSING_FIELDS[@]} -eq 0 ]]; then
    pass_test "Real API contract validation"
else
    fail_test "Real API contract validation - missing fields: ${MISSING_FIELDS[*]}"
fi

# Test 4: Real error handling test
echo "  🧪 Testing real error handling..."
ERROR_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d '{"invalid":"data"}')
ERROR_STATUS=$(echo "$ERROR_RESPONSE" | jq -r '.error // .message // empty')

if [[ -n "$ERROR_STATUS" ]]; then
    pass_test "Real error handling validation"
else
    fail_test "Real error handling validation - no error returned for invalid data"
fi

echo "✅ Phase 2 completed"
