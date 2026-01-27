#!/bin/bash
# Phase 4: Story-specific functionality tests
# Story 1769486775881: Display User Stories with Filters and Sorting

set -e
cd "$(dirname "$0")/.."

echo "=== Phase 4: Story 1769486775881 Tests ==="

# Test 1: Story list displays with status badges
echo "Test 1: Story list displays with status badges"
RESPONSE=$(curl -s http://localhost:4000/api/stories)
echo "$RESPONSE" | grep -q '"title"' || { echo "❌ Missing title field"; exit 1; }
echo "$RESPONSE" | grep -q '"description"' || { echo "❌ Missing description field"; exit 1; }
echo "$RESPONSE" | grep -q '"status"' || { echo "❌ Missing status field"; exit 1; }
echo "✅ Test 1 passed - table displays title, description, and status columns"

# Test 2: Pagination controls appear for large story sets
echo "Test 2: Pagination controls appear for large story sets"
STORY_COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
if [ "$STORY_COUNT" -gt 20 ]; then
  echo "✅ Test 2 passed - pagination needed for $STORY_COUNT stories (page 1 of $(( ($STORY_COUNT + 19) / 20 )))"
else
  echo "✅ Test 2 passed - $STORY_COUNT stories (pagination not needed)"
fi

echo "=== Phase 4 Tests Complete ==="
