#!/bin/bash
# Phase 4: Real Functionality Tests
# Tests actual functionality using dev DynamoDB via X-Use-Dev-Tables header

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../utilities/load-env-config.sh" prod

PASSED=0
FAILED=0
RUN_ID="phase4-real-$(date +%s)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Use dev tables for all tests
HEADER="-H 'X-Use-Dev-Tables: true'"

echo "🧪 Phase 4: Real Functionality Tests"
echo "====================================="
echo "Backend: $API_BASE (Production EC2)"
echo "Database: Development DynamoDB (via X-Use-Dev-Tables)"
echo "Run ID: $RUN_ID"
echo ""

# Helper functions
test_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=${4:-200}
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H 'Content-Type: application/json' \
      -H 'X-Use-Dev-Tables: true' \
      "$API_BASE$endpoint" \
      -d "$data")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H 'X-Use-Dev-Tables: true' \
      "$API_BASE$endpoint")
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo "$body"
    return 0
  else
    echo "HTTP $http_code" >&2
    return 1
  fi
}

cleanup_story() {
  local story_id=$1
  curl -s -X DELETE -H 'X-Use-Dev-Tables: true' "$API_BASE/api/stories/$story_id" > /dev/null 2>&1 || true
}

# Test 1: Create Story
echo "🧪 Test 1: Create Story"
echo "   Testing: POST /api/stories creates a new story"

TEST_STORY=$(cat <<EOF
{
  "title": "Phase4 Test Story $(date +%s)",
  "description": "Test story for Phase 4 functional tests",
  "asA": "tester",
  "iWant": "to verify story creation",
  "soThat": "we can confirm functionality works",
  "components": ["WorkModel"],
  "storyPoint": 1,
  "acceptWarnings": true
}
EOF
)

if RESULT=$(test_api POST "/api/stories" "$TEST_STORY" 201); then
  STORY_ID=$(echo "$RESULT" | jq -r '.id')
  if [ -n "$STORY_ID" ] && [ "$STORY_ID" != "null" ]; then
    echo "   ✅ Story created with ID: $STORY_ID"
    PASSED=$((PASSED + 1))
    
    # Test 2: Retrieve Story
    echo ""
    echo "🧪 Test 2: Retrieve Story"
    echo "   Testing: GET /api/stories/:id returns created story"
    
    if RETRIEVED=$(test_api GET "/api/stories/$STORY_ID"); then
      RETRIEVED_TITLE=$(echo "$RETRIEVED" | jq -r '.title')
      if echo "$RETRIEVED_TITLE" | grep -q "Phase4 Test Story"; then
        echo "   ✅ Story retrieved successfully"
        PASSED=$((PASSED + 1))
      else
        echo "   ❌ Story title mismatch"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "   ❌ Failed to retrieve story"
      FAILED=$((FAILED + 1))
    fi
    
    # Test 3: Update Story
    echo ""
    echo "🧪 Test 3: Update Story"
    echo "   Testing: PUT /api/stories/:id updates story"
    
    UPDATE_DATA=$(cat <<EOF
{
  "title": "Updated Phase4 Test Story",
  "description": "Updated description",
  "asA": "tester",
  "iWant": "to verify story updates",
  "soThat": "we can confirm update functionality",
  "components": ["WorkModel"],
  "storyPoint": 2,
  "status": "In Progress"
}
EOF
)
    
    if UPDATED=$(test_api PUT "/api/stories/$STORY_ID" "$UPDATE_DATA"); then
      UPDATED_TITLE=$(echo "$UPDATED" | jq -r '.title')
      UPDATED_POINTS=$(echo "$UPDATED" | jq -r '.storyPoint')
      if [ "$UPDATED_TITLE" = "Updated Phase4 Test Story" ] && [ "$UPDATED_POINTS" = "2" ]; then
        echo "   ✅ Story updated successfully"
        PASSED=$((PASSED + 1))
      else
        echo "   ❌ Story update verification failed"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "   ❌ Failed to update story"
      FAILED=$((FAILED + 1))
    fi
    
    # Test 4: List Stories
    echo ""
    echo "🧪 Test 4: List Stories"
    echo "   Testing: GET /api/stories returns story list"
    
    if STORIES=$(test_api GET "/api/stories"); then
      if echo "$STORIES" | jq -e --arg id "$STORY_ID" '.[] | select(.id == ($id | tonumber))' > /dev/null 2>&1; then
        echo "   ✅ Story appears in list"
        PASSED=$((PASSED + 1))
      else
        echo "   ❌ Story not found in list"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "   ❌ Failed to list stories"
      FAILED=$((FAILED + 1))
    fi
    
    # Test 5: Delete Story
    echo ""
    echo "🧪 Test 5: Delete Story"
    echo "   Testing: DELETE /api/stories/:id removes story"
    
    if test_api DELETE "/api/stories/$STORY_ID" "" 200 > /dev/null 2>&1; then
      # Verify deletion
      if ! test_api GET "/api/stories/$STORY_ID" "" 200 > /dev/null 2>&1; then
        echo "   ✅ Story deleted successfully"
        PASSED=$((PASSED + 1))
      else
        echo "   ❌ Story still exists after deletion"
        FAILED=$((FAILED + 1))
        cleanup_story "$STORY_ID"
      fi
    else
      echo "   ❌ Failed to delete story"
      FAILED=$((FAILED + 1))
      cleanup_story "$STORY_ID"
    fi
    
  else
    echo "   ❌ Story creation failed - no ID returned"
    FAILED=$((FAILED + 1))
  fi
else
  echo "   ❌ Story creation failed"
  FAILED=$((FAILED + 1))
fi

# Test 6: API Health
echo ""
echo "🧪 Test 6: API Health"
echo "   Testing: Backend responds to health check"

if test_api GET "/health" > /dev/null 2>&1; then
  echo "   ✅ API is healthy"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ API health check failed"
  FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "================================"
echo "📊 Phase 4 Real Functionality Test Summary"
echo "   Passed: $PASSED"
echo "   Failed: $FAILED"
echo "================================"
echo ""

if [ $FAILED -gt 0 ]; then
  exit 1
fi
