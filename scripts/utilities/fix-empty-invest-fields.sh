#!/bin/bash
set -e

API_BASE="${API_BASE:-http://44.197.204.18:4000}"

echo "🔍 Finding stories with empty INVEST fields..."

# Get all stories with empty asA, iWant, or soThat
EMPTY_STORIES=$(curl -s "$API_BASE/api/stories" | jq -c 'def flatten: . as $item | if type == "array" then map(flatten) | add else [$item] + (if .children then .children | flatten else [] end) end; flatten | map(select((.asA == "" or .asA == null) and (.iWant == "" or .iWant == null) and (.soThat == "" or .soThat == null))) | .[]')

TOTAL=$(echo "$EMPTY_STORIES" | wc -l)
echo "Found $TOTAL stories with all INVEST fields empty"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "✅ No stories need updating"
  exit 0
fi

UPDATED=0
FAILED=0

while IFS= read -r story; do
  ID=$(echo "$story" | jq -r '.id')
  TITLE=$(echo "$story" | jq -r '.title')
  
  echo "[$((UPDATED + FAILED + 1))/$TOTAL] Processing: $TITLE (ID: $ID)"
  
  # Generate basic INVEST fields from title
  AS_A="product manager"
  I_WANT="to $TITLE"
  SO_THAT="I can manage requirements effectively"
  
  # Update story with basic INVEST fields
  UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/api/stories/$ID" \
    -H 'Content-Type: application/json' \
    -d "{
      \"asA\": \"$AS_A\",
      \"iWant\": \"$I_WANT\",
      \"soThat\": \"$SO_THAT\"
    }" 2>&1)
  
  if echo "$UPDATE_RESPONSE" | jq -e '.id' >/dev/null 2>&1; then
    echo "  ✅ Updated with basic INVEST fields"
    UPDATED=$((UPDATED + 1))
  else
    echo "  ❌ Failed to update"
    FAILED=$((FAILED + 1))
  fi
  
  sleep 0.5
done <<< "$EMPTY_STORIES"

echo ""
echo "========================================="
echo "Summary:"
echo "  Total: $TOTAL"
echo "  ✅ Updated: $UPDATED"
echo "  ❌ Failed: $FAILED"
echo "========================================="
echo ""
echo "Note: Stories updated with basic INVEST fields."
echo "You can refine them later using the UI."
