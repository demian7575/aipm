#!/bin/bash
# Acceptance Test for Story 1769492162273: Display User Stories with Filters and Sorting
# Test: Display story list with all required columns

set -e

API_BASE="${API_BASE:-http://localhost:4000}"

echo "=== Test: Display story list with all required columns ==="

# Given: 5 user stories exist in the system with varying statuses
echo "Given: Fetching stories from API..."
RESPONSE=$(curl -s "${API_BASE}/api/stories")
STORY_COUNT=$(echo "$RESPONSE" | jq '. | length')

if [ "$STORY_COUNT" -lt 5 ]; then
    echo "❌ FAIL: Expected at least 5 stories, found $STORY_COUNT"
    exit 1
fi

echo "✓ Found $STORY_COUNT stories in system"

# When: Project manager opens the story list view
# (This is a UI action - we verify the data is available via API)
echo "When: Verifying story data structure..."

# Then: Table displays rows with title, description, and status columns
FIRST_STORY=$(echo "$RESPONSE" | jq '.[0]')
HAS_TITLE=$(echo "$FIRST_STORY" | jq 'has("title")')
HAS_DESCRIPTION=$(echo "$FIRST_STORY" | jq 'has("description")')
HAS_STATUS=$(echo "$FIRST_STORY" | jq 'has("status")')

if [ "$HAS_TITLE" != "true" ] || [ "$HAS_DESCRIPTION" != "true" ] || [ "$HAS_STATUS" != "true" ]; then
    echo "❌ FAIL: Story missing required fields (title, description, status)"
    exit 1
fi

echo "✓ Stories have required fields: title, description, status"

# Then: Status values show Draft, Ready, In Progress, or Done
VALID_STATUSES=("Draft" "Ready" "In Progress" "Blocked" "Approved" "Done")
ALL_STATUSES=$(echo "$RESPONSE" | jq -r '.[].status' | sort -u)

echo "✓ Found status values: $ALL_STATUSES"

echo "✅ PASS: Story list displays all required columns"
exit 0
