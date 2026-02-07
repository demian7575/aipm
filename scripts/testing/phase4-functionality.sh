#!/bin/bash
# Phase 4: Real Functionality Tests
# Only tests features that are actually implemented

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../utilities/load-env-config.sh" prod

PASSED=0
FAILED=0

echo "🧪 Phase 4: Real Functionality Tests"
echo "====================================="
echo ""

# Test 1: GET /api/stories - List stories
echo "Test 1: List all stories"
RESPONSE=$(curl -s "$API_BASE/api/stories")
if echo "$RESPONSE" | jq -e 'type == "array" and length > 0' > /dev/null 2>&1; then
  COUNT=$(echo "$RESPONSE" | jq 'length')
  echo "  ✅ PASS: Retrieved $COUNT stories"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Could not retrieve stories"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: GET /api/stories/:id - Get single story
echo "Test 2: Get single story by ID"
STORY_ID=$(echo "$RESPONSE" | jq -r '.[0].id')
SINGLE=$(curl -s "$API_BASE/api/stories/$STORY_ID")
if echo "$SINGLE" | jq -e '.id and .title' > /dev/null 2>&1; then
  TITLE=$(echo "$SINGLE" | jq -r '.title')
  echo "  ✅ PASS: Retrieved story #$STORY_ID: $TITLE"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Could not retrieve story #$STORY_ID"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: POST /api/stories - Create story
echo "Test 3: Create new story"
TIMESTAMP=$(date +%s)
NEW_STORY=$(curl -s -X POST "$API_BASE/api/stories" \
  -H 'Content-Type: application/json' \
  -d "{
    \"title\": \"Test Story $TIMESTAMP\",
    \"asA\": \"tester\",
    \"iWant\": \"to verify story creation\",
    \"soThat\": \"I can confirm the API works\",
    \"description\": \"Automated test story\",
    \"acceptWarnings\": true
  }")

if echo "$NEW_STORY" | jq -e '.id' > /dev/null 2>&1; then
  NEW_ID=$(echo "$NEW_STORY" | jq -r '.id')
  echo "  ✅ PASS: Created story #$NEW_ID"
  PASSED=$((PASSED + 1))
  
  # Test 4: PUT /api/stories/:id - Update story
  echo ""
  echo "Test 4: Update story"
  UPDATED=$(curl -s -X PUT "$API_BASE/api/stories/$NEW_ID" \
    -H 'Content-Type: application/json' \
    -d "{
      \"title\": \"Updated Test Story $TIMESTAMP\",
      \"asA\": \"tester\",
      \"iWant\": \"to verify story updates\",
      \"soThat\": \"I can confirm updates work\",
      \"description\": \"Updated description\"
    }")
  
  if echo "$UPDATED" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "  ✅ PASS: Updated story #$NEW_ID"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ FAIL: Could not update story #$NEW_ID"
    FAILED=$((FAILED + 1))
  fi
  
  # Test 5: DELETE /api/stories/:id - Delete story
  echo ""
  echo "Test 5: Delete story"
  DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/api/stories/$NEW_ID")
  
  # Verify deletion
  VERIFY=$(curl -s "$API_BASE/api/stories/$NEW_ID")
  if echo "$VERIFY" | jq -e '.message' | grep -q "not found"; then
    echo "  ✅ PASS: Deleted story #$NEW_ID"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ FAIL: Could not delete story #$NEW_ID"
    FAILED=$((FAILED + 1))
  fi
else
  echo "  ❌ FAIL: Could not create story"
  FAILED=$((FAILED + 1))
  echo "  Skipping update and delete tests"
  FAILED=$((FAILED + 2))
fi
echo ""

# Test 6: GET /health - Health check
echo "Test 6: Health check"
HEALTH=$(curl -s "$API_BASE/health")
if echo "$HEALTH" | jq -e '.status == "running"' > /dev/null 2>&1; then
  echo "  ✅ PASS: Backend is healthy"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Health check failed"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 7: GET /api/version - Version info
echo "Test 7: Version info"
VERSION=$(curl -s "$API_BASE/api/version")
if echo "$VERSION" | jq -e '.version' > /dev/null 2>&1; then
  VER=$(echo "$VERSION" | jq -r '.version')
  echo "  ✅ PASS: Version $VER"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Could not get version"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 8: Frontend accessibility
echo "Test 8: Frontend accessibility"
FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
if curl -s "$FRONTEND_URL" | grep -q "AI Project Manager"; then
  echo "  ✅ PASS: Frontend is accessible"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Frontend not accessible"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 9: Story 1770435990551 - View All Stories button exists
if [ "$1" = "1770435990551" ]; then
  echo "Test 9: View All Stories button exists in HTML"
  if curl -s "$FRONTEND_URL" | grep -q "view-all-stories-btn"; then
    echo "  ✅ PASS: View All Stories button found in HTML"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ FAIL: View All Stories button not found"
    FAILED=$((FAILED + 1))
  fi
  echo ""
fi

# Summary
echo "====================================="
echo "Phase 4 Results:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  Total: $((PASSED + FAILED))"
echo "====================================="

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0
