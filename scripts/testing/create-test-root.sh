#!/bin/bash
# Verify Test Parent Story exists (ID: 1768631018504)

source "$(dirname "$0")/test-functions.sh"

echo "🌳 Verifying Test Parent story (ID: $TEST_PARENT_ID)..."

# Check if Test Parent exists
EXISTING_PARENT=$(curl -s "$PROD_API_BASE/api/stories" | jq -r ".[] | select(.id == $TEST_PARENT_ID) | .id")

if [[ -n "$EXISTING_PARENT" && "$EXISTING_PARENT" != "null" ]]; then
  echo "✅ Test Parent exists (ID: $TEST_PARENT_ID)"
  echo "$TEST_PARENT_ID"
  exit 0
else
  echo "❌ Test Parent story (ID: $TEST_PARENT_ID) not found"
  echo "   Please create this story manually or update TEST_PARENT_ID in test-functions.sh"
  exit 1
fi
