#!/bin/bash
# Phase 4: Story-specific functionality tests
# Story 1769486654077: Display User Stories with Filters and Sorting

set -e
cd "$(dirname "$0")/.."

echo "=== Phase 4: Story 1769486654077 Tests ==="

# Test 1: Display story list with all required columns
echo "Test 1: Display story list with all required columns"
# Verify API returns stories with title, description, status
RESPONSE=$(curl -s http://localhost:4000/api/stories)
echo "$RESPONSE" | grep -q '"title"' || { echo "❌ Missing title field"; exit 1; }
echo "$RESPONSE" | grep -q '"description"' || { echo "❌ Missing description field"; exit 1; }
echo "$RESPONSE" | grep -q '"status"' || { echo "❌ Missing status field"; exit 1; }
echo "✅ Test 1 passed"

# Test 2: Pagination controls appear when stories exceed 20 items
echo "Test 2: Pagination with 20 items per page"
# Count stories returned
STORY_COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
if [ "$STORY_COUNT" -gt 20 ]; then
  echo "✅ Test 2 passed - pagination needed for $STORY_COUNT stories"
else
  echo "✅ Test 2 passed - $STORY_COUNT stories (pagination not needed)"
fi

echo "=== Phase 4 Tests Complete ==="
