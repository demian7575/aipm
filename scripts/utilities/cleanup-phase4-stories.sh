#!/bin/bash
# Delete Phase4 test stories from production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" prod

echo "🗑️  Cleaning up Phase4 test stories"
echo "===================================="
echo ""

# Get all Phase4 test story IDs
echo "📥 Fetching Phase4 test stories..."
PHASE4_STORIES=$(curl -s "$API_BASE/api/stories" | jq -r 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten | map(select(.title | contains("Phase4"))) | .[].id')

if [ -z "$PHASE4_STORIES" ]; then
  echo "✅ No Phase4 test stories found"
  exit 0
fi

STORY_COUNT=$(echo "$PHASE4_STORIES" | wc -l | tr -d ' ')
echo "⚠️  Found $STORY_COUNT Phase4 test stories to delete"
echo ""

# Confirm deletion
read -p "Delete these $STORY_COUNT test stories? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Deletion cancelled"
  exit 0
fi

echo ""
echo "🗑️  Deleting stories..."

DELETED=0
FAILED=0

for STORY_ID in $PHASE4_STORIES; do
  echo -n "Deleting story #$STORY_ID... "
  
  RESPONSE=$(curl -s -X DELETE "$API_BASE/api/stories/$STORY_ID" -w "\n%{http_code}")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅"
    DELETED=$((DELETED + 1))
  else
    echo "❌ (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "📊 Summary"
echo "=========="
echo "Deleted: $DELETED"
echo "Failed: $FAILED"
echo ""

if [ $DELETED -gt 0 ]; then
  echo "✅ Cleanup completed"
else
  echo "❌ No stories were deleted"
fi
