#!/bin/bash
# Acceptance tests for Story 1769501555774: Display User Stories with Filters and Sorting

set -e

echo "Running acceptance tests for Story 1769501555774..."

# Test 1: Story list displays all stories with required columns
echo "Test 1: Story list displays all stories with required columns"
RESPONSE=$(curl -s http://localhost:4000/api/stories?page=1&limit=20)
STORY_COUNT=$(echo "$RESPONSE" | jq '.stories | length')
if [ "$STORY_COUNT" -gt 0 ]; then
  FIRST_STORY=$(echo "$RESPONSE" | jq '.stories[0]')
  HAS_TITLE=$(echo "$FIRST_STORY" | jq 'has("title")')
  HAS_DESCRIPTION=$(echo "$FIRST_STORY" | jq 'has("description")')
  HAS_STATUS=$(echo "$FIRST_STORY" | jq 'has("status")')
  
  if [ "$HAS_TITLE" = "true" ] && [ "$HAS_DESCRIPTION" = "true" ] && [ "$HAS_STATUS" = "true" ]; then
    echo "✅ Test 1 passed: Stories have required columns"
  else
    echo "❌ Test 1 failed: Missing required columns"
    exit 1
  fi
else
  echo "⚠️  Test 1 skipped: No stories in system"
fi

# Test 2: Pagination controls appear when stories exceed 20 items
echo "Test 2: Pagination controls appear when stories exceed 20 items"
RESPONSE=$(curl -s http://localhost:4000/api/stories?page=1&limit=20)
TOTAL=$(echo "$RESPONSE" | jq '.pagination.total')
TOTAL_PAGES=$(echo "$RESPONSE" | jq '.pagination.totalPages')
PAGE=$(echo "$RESPONSE" | jq '.pagination.page')

if [ "$TOTAL" -gt 20 ]; then
  if [ "$TOTAL_PAGES" -gt 1 ] && [ "$PAGE" -eq 1 ]; then
    echo "✅ Test 2 passed: Pagination works correctly"
  else
    echo "❌ Test 2 failed: Pagination not working"
    exit 1
  fi
else
  echo "⚠️  Test 2 skipped: Less than 20 stories in system"
fi

echo "All acceptance tests passed!"
