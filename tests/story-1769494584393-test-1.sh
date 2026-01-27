#!/bin/bash
# Acceptance Test for Story 1769494584393
# Test: Display story list with all required columns

set -e

API_BASE="${API_BASE:-http://localhost:4000}"

echo "=== Test: Display story list with all required columns ==="

RESPONSE=$(curl -s "${API_BASE}/api/stories")
STORY_COUNT=$(echo "$RESPONSE" | jq '. | length')

if [ "$STORY_COUNT" -lt 5 ]; then
    echo "❌ FAIL: Expected at least 5 stories, found $STORY_COUNT"
    exit 1
fi

echo "✓ Found $STORY_COUNT stories in system"

FIRST_STORY=$(echo "$RESPONSE" | jq '.[0]')
HAS_TITLE=$(echo "$FIRST_STORY" | jq 'has("title")')
HAS_DESCRIPTION=$(echo "$FIRST_STORY" | jq 'has("description")')
HAS_STATUS=$(echo "$FIRST_STORY" | jq 'has("status")')

if [ "$HAS_TITLE" != "true" ] || [ "$HAS_DESCRIPTION" != "true" ] || [ "$HAS_STATUS" != "true" ]; then
    echo "❌ FAIL: Story missing required fields"
    exit 1
fi

echo "✓ Stories have required fields: title, description, status"
echo "✅ PASS: Story list displays all required columns"
exit 0
