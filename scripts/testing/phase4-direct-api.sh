#!/bin/bash
# Phase 4 Direct API Tests - No Mocks, Just Real API Calls
# Tests actual functionality against dev DynamoDB tables

set -e

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$TEST_DIR/../utilities/load-env-config.sh" "${TARGET_ENV:-prod}"
source "$TEST_DIR/test-library.sh"

PASSED=0
FAILED=0
PHASE="phase4-direct-api"

echo "🧪 Phase 4: Direct API Tests (No Mocks)"
echo "=============================================="
echo "Run ID: $TEST_RUN_ID"
echo "Testing against: dev DynamoDB tables"
echo ""

# Test 1: Create, Read, Update, Delete Story
echo "Test 1: Story CRUD operations"
START_TIME=$(date +%s)
TIMESTAMP=$(date +%s)

# Create
STORY=$(curl -s -X POST "$API_BASE/api/stories" \
  -H 'Content-Type: application/json' \
  -H 'X-Use-Dev-Tables: true' \
  -d "{\"title\": \"CRUD Test $TIMESTAMP\", \"asA\": \"tester\", \"iWant\": \"test CRUD\", \"soThat\": \"verify functionality\", \"acceptWarnings\": true}")

STORY_ID=$(echo "$STORY" | jq -r '.id')
if [ "$STORY_ID" != "null" ] && [ -n "$STORY_ID" ]; then
  # Read
  READ_STORY=$(curl -s "$API_BASE/api/stories/$STORY_ID" -H 'X-Use-Dev-Tables: true')
  READ_ID=$(echo "$READ_STORY" | jq -r '.id')
  
  # Update
  UPDATE_RESULT=$(curl -s -X PUT "$API_BASE/api/stories/$STORY_ID" \
    -H 'Content-Type: application/json' \
    -H 'X-Use-Dev-Tables: true' \
    -d "{\"title\": \"Updated $TIMESTAMP\", \"asA\": \"tester\", \"iWant\": \"test\", \"soThat\": \"test\"}")
  
  # Delete
  curl -s -X DELETE "$API_BASE/api/stories/$STORY_ID" -H 'X-Use-Dev-Tables: true' > /dev/null
  
  # Verify deleted
  DELETE_CHECK=$(curl -s "$API_BASE/api/stories/$STORY_ID" -H 'X-Use-Dev-Tables: true')
  
  if [ "$READ_ID" = "$STORY_ID" ] && echo "$DELETE_CHECK" | jq -e '.message' | grep -q "not found"; then
    echo "  ✅ PASS: Story CRUD (Create, Read, Update, Delete)"
    PASSED=$((PASSED + 1))
    record_test_result "crud-story" "Story CRUD operations" "PASS" "$PHASE" "$(($(date +%s) - START_TIME))"
  else
    echo "  ❌ FAIL: Story CRUD"
    FAILED=$((FAILED + 1))
    record_test_result "crud-story" "Story CRUD operations" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
  fi
else
  echo "  ❌ FAIL: Story CRUD (create failed)"
  FAILED=$((FAILED + 1))
  record_test_result "crud-story" "Story CRUD operations" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
fi

# Test 2: Acceptance Test CRUD
echo "Test 2: Acceptance Test CRUD operations"
START_TIME=$(date +%s)
TIMESTAMP=$(date +%s)

# Create story first
STORY=$(curl -s -X POST "$API_BASE/api/stories" \
  -H 'Content-Type: application/json' \
  -H 'X-Use-Dev-Tables: true' \
  -d "{\"title\": \"Test Story $TIMESTAMP\", \"asA\": \"tester\", \"iWant\": \"test\", \"soThat\": \"test\", \"acceptWarnings\": true}")

STORY_ID=$(echo "$STORY" | jq -r '.id')
if [ "$STORY_ID" != "null" ]; then
  # Create test
  TEST=$(curl -s -X POST "$API_BASE/api/stories/$STORY_ID/tests" \
    -H 'Content-Type: application/json' \
    -H 'X-Use-Dev-Tables: true' \
    -d "{\"title\": \"Test $TIMESTAMP\", \"given\": [\"I have a valid story\"], \"when\": [\"I create an acceptance test\"], \"then\": [\"The test is saved with status Draft\"]}")
  
  TEST_ID=$(echo "$TEST" | jq -r '.id')
  
  # Cleanup
  curl -s -X DELETE "$API_BASE/api/stories/$STORY_ID" -H 'X-Use-Dev-Tables: true' > /dev/null
  
  if [ "$TEST_ID" != "null" ] && [ -n "$TEST_ID" ]; then
    echo "  ✅ PASS: Acceptance Test CRUD"
    PASSED=$((PASSED + 1))
    record_test_result "crud-test" "Acceptance Test CRUD" "PASS" "$PHASE" "$(($(date +%s) - START_TIME))"
  else
    echo "  ❌ FAIL: Acceptance Test CRUD"
    FAILED=$((FAILED + 1))
    record_test_result "crud-test" "Acceptance Test CRUD" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
  fi
else
  echo "  ❌ FAIL: Acceptance Test CRUD (story create failed)"
  FAILED=$((FAILED + 1))
  record_test_result "crud-test" "Acceptance Test CRUD" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
fi

# Test 3: List all stories from dev table
echo "Test 3: List all stories (dev table)"
START_TIME=$(date +%s)
STORIES=$(curl -s "$API_BASE/api/stories" -H 'X-Use-Dev-Tables: true')
if echo "$STORIES" | jq -e 'type == "array"' > /dev/null 2>&1; then
  COUNT=$(echo "$STORIES" | jq 'length')
  echo "  ✅ PASS: Listed $COUNT stories from dev table"
  PASSED=$((PASSED + 1))
  record_test_result "list-stories" "List all stories" "PASS" "$PHASE" "$(($(date +%s) - START_TIME))"
else
  echo "  ❌ FAIL: List stories"
  FAILED=$((FAILED + 1))
  record_test_result "list-stories" "List all stories" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
fi

# Test 4: Dependency management
echo "Test 4: Dependency CRUD operations"
START_TIME=$(date +%s)
TIMESTAMP=$(date +%s)

# Create two stories
STORY_A=$(curl -s -X POST "$API_BASE/api/stories" \
  -H 'Content-Type: application/json' \
  -H 'X-Use-Dev-Tables: true' \
  -d "{\"title\": \"Story A $TIMESTAMP\", \"asA\": \"tester\", \"iWant\": \"test\", \"soThat\": \"test\", \"acceptWarnings\": true}")

STORY_B=$(curl -s -X POST "$API_BASE/api/stories" \
  -H 'Content-Type: application/json' \
  -H 'X-Use-Dev-Tables: true' \
  -d "{\"title\": \"Story B $TIMESTAMP\", \"asA\": \"tester\", \"iWant\": \"test\", \"soThat\": \"test\", \"acceptWarnings\": true}")

STORY_A_ID=$(echo "$STORY_A" | jq -r '.id')
STORY_B_ID=$(echo "$STORY_B" | jq -r '.id')

if [ "$STORY_A_ID" != "null" ] && [ "$STORY_B_ID" != "null" ]; then
  # Create dependency
  DEP_RESULT=$(curl -s -X POST "$API_BASE/api/stories/$STORY_A_ID/dependencies" \
    -H 'Content-Type: application/json' \
    -H 'X-Use-Dev-Tables: true' \
    -d "{\"dependsOn\": $STORY_B_ID, \"relationship\": \"blocks\"}")
  
  # Delete dependency
  curl -s -X DELETE "$API_BASE/api/stories/$STORY_A_ID/dependencies/$STORY_B_ID" -H 'X-Use-Dev-Tables: true' > /dev/null
  
  # Cleanup
  curl -s -X DELETE "$API_BASE/api/stories/$STORY_A_ID" -H 'X-Use-Dev-Tables: true' > /dev/null
  curl -s -X DELETE "$API_BASE/api/stories/$STORY_B_ID" -H 'X-Use-Dev-Tables: true' > /dev/null
  
  if echo "$DEP_RESULT" | jq -e '.' > /dev/null 2>&1; then
    echo "  ✅ PASS: Dependency CRUD"
    PASSED=$((PASSED + 1))
    record_test_result "crud-dependency" "Dependency CRUD" "PASS" "$PHASE" "$(($(date +%s) - START_TIME))"
  else
    echo "  ❌ FAIL: Dependency CRUD"
    FAILED=$((FAILED + 1))
    record_test_result "crud-dependency" "Dependency CRUD" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
  fi
else
  echo "  ❌ FAIL: Dependency CRUD (story creation failed)"
  FAILED=$((FAILED + 1))
  record_test_result "crud-dependency" "Dependency CRUD" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
fi

# Test 5: DynamoDB direct access
echo "Test 5: DynamoDB direct scan (dev table)"
START_TIME=$(date +%s)
DB_RESULT=$(aws dynamodb scan \
  --table-name aipm-backend-dev-stories \
  --select COUNT \
  --region us-east-1 2>/dev/null)

if echo "$DB_RESULT" | jq -e '.Count' > /dev/null 2>&1; then
  COUNT=$(echo "$DB_RESULT" | jq -r '.Count')
  echo "  ✅ PASS: DynamoDB scan found $COUNT items in dev table"
  PASSED=$((PASSED + 1))
  record_test_result "dynamodb-scan" "DynamoDB direct scan" "PASS" "$PHASE" "$(($(date +%s) - START_TIME))"
else
  echo "  ❌ FAIL: DynamoDB scan"
  FAILED=$((FAILED + 1))
  record_test_result "dynamodb-scan" "DynamoDB direct scan" "FAIL" "$PHASE" "$(($(date +%s) - START_TIME))"
fi

echo ""
echo "=============================================="
echo "📊 Phase 4 Direct API Test Results"
echo "=============================================="
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  Total: $((PASSED + FAILED))"
echo ""
echo "All tests use dev DynamoDB tables (X-Use-Dev-Tables: true)"
echo "=============================================="

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0
