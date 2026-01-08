#!/bin/bash
# Real Infrastructure & Integration Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🟢 Phase 3: Real Infrastructure & Integration Tests"

# Test 1: Real frontend-backend integration
echo "  🧪 Testing real frontend-backend integration..."
# Get frontend config and verify it points to working backend
FRONTEND_CONFIG=$(curl -s "$PROD_FRONTEND_URL/config-prod.js")
API_URL=$(echo "$FRONTEND_CONFIG" | grep -o 'API_BASE_URL: [^,]*' | cut -d'"' -f2)

if [[ -n "$API_URL" ]]; then
    # Test if the configured API actually works
    API_TEST=$(curl -s "$API_URL/api/version" | jq -r '.version // empty')
    if [[ -n "$API_TEST" ]]; then
        pass_test "Real frontend-backend integration (API: $API_URL)"
    else
        fail_test "Real frontend-backend integration - API not responding: $API_URL"
    fi
else
    fail_test "Real frontend-backend integration - no API URL in config"
fi

# Test 2: Real S3 static hosting functionality
echo "  🧪 Testing real S3 static hosting..."
# Test multiple static assets
ASSETS=("index.html" "app.js" "styles.css")
ASSET_FAILURES=()

for asset in "${ASSETS[@]}"; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_FRONTEND_URL/$asset")
    if [[ "$HTTP_STATUS" != "200" ]]; then
        ASSET_FAILURES+=("$asset:$HTTP_STATUS")
    fi
done

if [[ ${#ASSET_FAILURES[@]} -eq 0 ]]; then
    pass_test "Real S3 static hosting (${#ASSETS[@]} assets)"
else
    fail_test "Real S3 static hosting - failed assets: ${ASSET_FAILURES[*]}"
fi

# Test 3: Real database persistence across requests
echo "  🧪 Testing real database persistence..."
# Create a story, restart would happen in real deployment, then verify it persists
PERSIST_DATA='{"title":"Persistence Test","description":"Testing real persistence","storyPoint":3}'
PERSIST_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" -H "Content-Type: application/json" -d "$PERSIST_DATA")
PERSIST_ID=$(echo "$PERSIST_RESPONSE" | jq -r '.id // empty')

if [[ -n "$PERSIST_ID" ]]; then
    # Wait a moment then retrieve
    sleep 2
    RETRIEVED=$(curl -s "$PROD_API_BASE/api/stories/$PERSIST_ID")
    RETRIEVED_TITLE=$(echo "$RETRIEVED" | jq -r '.title // empty')
    
    if [[ "$RETRIEVED_TITLE" == "Persistence Test" ]]; then
        pass_test "Real database persistence"
        # Cleanup
        curl -s -X DELETE "$PROD_API_BASE/api/stories/$PERSIST_ID" > /dev/null
    else
        fail_test "Real database persistence - story not persisted"
    fi
else
    fail_test "Real database persistence - could not create test story"
fi

# Test 4: Real cross-environment data sync
echo "  🧪 Testing real cross-environment data sync..."
# Get story counts from both environments
PROD_COUNT=$(curl -s "$PROD_API_BASE/api/stories" | jq 'length')
DEV_COUNT=$(curl -s "$DEV_API_BASE/api/stories" | jq 'length')

# Get a sample story from each to verify actual sync
PROD_SAMPLE=$(curl -s "$PROD_API_BASE/api/stories" | jq -r '.[0].title // empty')
DEV_SAMPLE=$(curl -s "$DEV_API_BASE/api/stories" | jq -r '.[0].title // empty')

if [[ "$PROD_COUNT" -eq "$DEV_COUNT" && "$PROD_SAMPLE" == "$DEV_SAMPLE" && -n "$PROD_SAMPLE" ]]; then
    pass_test "Real cross-environment data sync ($PROD_COUNT stories, sample: $PROD_SAMPLE)"
else
    fail_test "Real cross-environment data sync - prod: $PROD_COUNT/$PROD_SAMPLE, dev: $DEV_COUNT/$DEV_SAMPLE"
fi

echo "✅ Phase 3 completed"
