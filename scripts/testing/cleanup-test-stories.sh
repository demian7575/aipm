#!/bin/bash
# Clean up orphaned test stories

PROD_API_BASE="http://44.220.45.57"

echo "🧹 Cleaning up orphaned test stories..."

# Get all root stories with "Test" in title
TEST_STORIES=$(curl -s "$PROD_API_BASE/api/stories" | jq -r '.[] | select(.title | contains("Test")) | select(.parentId == null or .parentId == 0) | .id' 2>/dev/null)

if [[ -z "$TEST_STORIES" ]]; then
    echo "✅ No orphaned test stories found"
    exit 0
fi

COUNT=0
for STORY_ID in $TEST_STORIES; do
    echo "  Deleting story $STORY_ID..."
    HTTP_CODE=$(curl -s -X DELETE "$PROD_API_BASE/api/stories/$STORY_ID" -w "%{http_code}" -o /dev/null)
    
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "204" ]]; then
        echo "    ✅ Deleted $STORY_ID"
        COUNT=$((COUNT + 1))
    else
        echo "    ❌ Failed to delete $STORY_ID (HTTP $HTTP_CODE)"
    fi
done

echo ""
echo "🎉 Cleaned up $COUNT test stories"
