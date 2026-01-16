#!/bin/bash
# Create Test Root Story for Gating Tests

source "$(dirname "$0")/test-functions.sh"

echo "🌳 Creating Test Root story..."

# Check if Test Root already exists
EXISTING_ROOT=$(curl -s "$PROD_API_BASE/api/stories" | jq -r '.[] | select(.title == "Test Root") | .id')

if [[ -n "$EXISTING_ROOT" && "$EXISTING_ROOT" != "null" ]]; then
  echo "✅ Test Root already exists (ID: $EXISTING_ROOT)"
  echo "$EXISTING_ROOT"
  exit 0
fi

# Create Test Root story
TEST_ROOT_PAYLOAD='{
  "title": "Test Root",
  "description": "Root story for all gating test stories. All test stories should be created as children of this story.",
  "asA": "test automation",
  "iWant": "a dedicated root for test stories",
  "soThat": "test data is organized and easy to clean up",
  "storyPoint": 0,
  "status": "Ready",
  "acceptWarnings": true
}'

CREATE_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" \
  -H "Content-Type: application/json" \
  -d "$TEST_ROOT_PAYLOAD")

TEST_ROOT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [[ -n "$TEST_ROOT_ID" ]]; then
  echo "✅ Test Root created (ID: $TEST_ROOT_ID)"
  echo "$TEST_ROOT_ID"
  exit 0
else
  echo "❌ Failed to create Test Root"
  exit 1
fi
