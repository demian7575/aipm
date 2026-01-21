#!/bin/bash
# Clean up orphaned test stories created by gating tests

PROD_API_BASE="http://3.92.96.67"

echo "🧹 Cleaning up orphaned gating test stories..."

# Only delete stories with exact test patterns created by gating tests
# Pattern 1: "Test Story TIMESTAMP" (from phase4 tests)
# Pattern 2: "Test Root Story" (test container)
TEST_STORIES=$(curl -s "$PROD_API_BASE/api/stories" | jq -r '.[] | select(.title | test("^Test Story [0-9]+$|^Test Root Story$")) | select(.parentId == null or .parentId == 0) | .id' 2>/dev/null)

if [[ -z "$TEST_STORIES" ]]; then
    echo "✅ No orphaned test stories found"
    exit 0
fi

echo "Found test stories to clean:"
curl -s "$PROD_API_BASE/api/stories" | jq -r '.[] | select(.title | test("^Test Story [0-9]+$|^Test Root Story$")) | select(.parentId == null or .parentId == 0) | "  - \(.id): \(.title)"' 2>/dev/null

echo ""
read -p "Delete these stories? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
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
