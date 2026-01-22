#!/bin/bash
# Clean up ALL test stories and set test parent to 1768631018504

PROD_API_BASE="http://44.197.204.18"
TEST_PARENT_ID=1768631018504

echo "🧹 Cleaning up ALL test stories..."
echo "📌 Test parent will be set to: $TEST_PARENT_ID"
echo ""

# Get all stories
ALL_STORIES=$(curl -s "$PROD_API_BASE/api/stories")

# Find test stories (various patterns)
TEST_STORIES=$(echo "$ALL_STORIES" | jq -r '.[] | select(
  .title | test("(?i)test|gating|phase|mock|sample|demo|example")
) | .id' 2>/dev/null)

if [[ -z "$TEST_STORIES" ]]; then
    echo "✅ No test stories found"
    exit 0
fi

echo "Found test stories to delete:"
echo "$ALL_STORIES" | jq -r '.[] | select(
  .title | test("(?i)test|gating|phase|mock|sample|demo|example")
) | "  - \(.id): \(.title) (parent: \(.parentId // "null"))"' 2>/dev/null

echo ""
echo "⚠️  This will delete $(echo "$TEST_STORIES" | wc -l) stories"
read -p "Continue? (y/N): " -n 1 -r
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
echo ""
echo "📝 Test parent ID for future tests: $TEST_PARENT_ID"
echo "   Use this ID as parentId when creating test stories"
