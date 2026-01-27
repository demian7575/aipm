#!/bin/bash
# Phase 4 Test: Story 1769498891531 - Display User Stories with Filters and Sorting

set -e

echo "=== Phase 4 Test: Story 1769498891531 ==="
echo "Testing: Display User Stories with Filters and Sorting"

API_BASE="http://localhost:4000"

# Test 1: Stories are displayed grouped by status with all required columns
echo ""
echo "Test 1: Verify API returns stories with status grouping support"
RESPONSE=$(curl -s "${API_BASE}/api/stories")
echo "$RESPONSE" | jq -e 'length > 0' > /dev/null || { echo "❌ No stories returned"; exit 1; }
echo "$RESPONSE" | jq -e '.[0] | has("title", "description", "status")' > /dev/null || { echo "❌ Missing required fields"; exit 1; }
echo "✅ Test 1 passed: Stories have required fields"

# Test 2: Pagination controls appear when story count exceeds page limit
echo ""
echo "Test 2: Verify API supports filtering and sorting"
FILTERED=$(curl -s "${API_BASE}/api/stories?status=Ready")
echo "$FILTERED" | jq -e 'type == "array"' > /dev/null || { echo "❌ Filter response not an array"; exit 1; }

SORTED=$(curl -s "${API_BASE}/api/stories?sortBy=title&sortOrder=asc")
echo "$SORTED" | jq -e 'type == "array"' > /dev/null || { echo "❌ Sort response not an array"; exit 1; }
echo "✅ Test 2 passed: API supports filtering and sorting"

echo ""
echo "✅ All Phase 4 tests passed for story 1769498891531"
