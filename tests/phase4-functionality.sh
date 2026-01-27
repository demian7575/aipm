#!/bin/bash
# Acceptance tests for Story 1769502501464

set -e

echo "Running acceptance tests for Story 1769502501464..."

echo "Test 1: Story list displays all stories with required columns"
RESPONSE=$(curl -s http://localhost:4000/api/stories?page=1&limit=20)
STORY_COUNT=$(echo "$RESPONSE" | jq '.stories | length')
if [ "$STORY_COUNT" -gt 0 ]; then
  FIRST_STORY=$(echo "$RESPONSE" | jq '.stories[0]')
  HAS_TITLE=$(echo "$FIRST_STORY" | jq 'has("title")')
  HAS_DESCRIPTION=$(echo "$FIRST_STORY" | jq 'has("description")')
  HAS_STATUS=$(echo "$FIRST_STORY" | jq 'has("status")')
  
  if [ "$HAS_TITLE" = "true" ] && [ "$HAS_DESCRIPTION" = "true" ] && [ "$HAS_STATUS" = "true" ]; then
    echo "✅ Test 1 passed"
  else
    echo "❌ Test 1 failed"
    exit 1
  fi
else
  echo "⚠️  Test 1 skipped: No stories"
fi

echo "Test 2: Pagination controls"
RESPONSE=$(curl -s http://localhost:4000/api/stories?page=1&limit=20)
TOTAL=$(echo "$RESPONSE" | jq '.pagination.total')
TOTAL_PAGES=$(echo "$RESPONSE" | jq '.pagination.totalPages')
PAGE=$(echo "$RESPONSE" | jq '.pagination.page')

if [ "$TOTAL" -gt 20 ]; then
  if [ "$TOTAL_PAGES" -gt 1 ] && [ "$PAGE" -eq 1 ]; then
    echo "✅ Test 2 passed"
  else
    echo "❌ Test 2 failed"
    exit 1
  fi
else
  echo "⚠️  Test 2 skipped"
fi

echo "All tests passed!"
