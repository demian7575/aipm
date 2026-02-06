#!/bin/bash
# Generate acceptance tests for all stories by regenerating story format
# POST-aipm-story-draft automatically includes 1-2 acceptance tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" prod

echo "🔍 Acceptance Test Generation"
echo "=============================="
echo ""

# Fetch all stories
echo "📥 Fetching all stories..."
ALL_STORIES=$(curl -s "$API_BASE/api/stories")
FLAT_STORIES=$(echo "$ALL_STORIES" | jq 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten')
STORY_COUNT=$(echo "$FLAT_STORIES" | jq 'length')
echo "✅ Found $STORY_COUNT stories"
echo ""

# Find stories without acceptance tests
STORIES_NEEDING_TESTS=$(echo "$FLAT_STORIES" | jq -r '
  .[] | 
  select(.acceptanceTests == null or (.acceptanceTests | length) == 0) |
  .id
')

if [ -z "$STORIES_NEEDING_TESTS" ]; then
  echo "✅ All stories have acceptance tests"
  exit 0
fi

TEST_COUNT=$(echo "$STORIES_NEEDING_TESTS" | wc -l | tr -d ' ')
echo "⚠️  Found $TEST_COUNT stories needing acceptance tests"
echo ""

TESTS_GENERATED=0
TESTS_FAILED=0

for STORY_ID in $STORIES_NEEDING_TESTS; do
  echo "🧪 [$((TESTS_GENERATED + TESTS_FAILED + 1))/$TEST_COUNT] Story #$STORY_ID..."
  
  STORY=$(echo "$FLAT_STORIES" | jq ".[] | select(.id == $STORY_ID)")
  TITLE=$(echo "$STORY" | jq -r '.title')
  DESCRIPTION=$(echo "$STORY" | jq -r '.description // ""')
  
  # Call story-draft API (includes acceptance tests automatically)
  DRAFT_RESPONSE=$(curl -s -X POST "$SEMANTIC_API_BASE/api/aipm-story-draft" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg rid "gen-tests-$STORY_ID" --arg t "$TITLE" --arg d "$DESCRIPTION" \
      '{requestId: $rid, title: $t, description: $d}')" 2>&1)
  
  # Parse response
  DRAFT_DATA=$(echo "$DRAFT_RESPONSE" | grep "^data: " | tail -1 | sed 's/^data: //')
  
  if echo "$DRAFT_DATA" | jq -e '.acceptanceTests' > /dev/null 2>&1; then
    ACCEPTANCE_TESTS=$(echo "$DRAFT_DATA" | jq -c '.acceptanceTests')
    TEST_COUNT_IN_RESPONSE=$(echo "$ACCEPTANCE_TESTS" | jq 'length')
    
    # Create story with acceptance tests via POST /api/stories
    # This will create both story and tests in one transaction
    CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/stories" \
      -H 'Content-Type: application/json' \
      -d "$(echo "$STORY" | jq -c --argjson tests "$ACCEPTANCE_TESTS" \
        '{
          id: .id,
          title: .title,
          description: .description,
          asA: .asA,
          iWant: .iWant,
          soThat: .soThat,
          components: .components,
          storyPoint: .storyPoint,
          assigneeEmail: .assigneeEmail,
          parentId: .parentId,
          acceptanceTests: $tests,
          acceptWarnings: true
        }')" 2>&1)
    
    if echo "$CREATE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
      echo "   ✅ Created $TEST_COUNT_IN_RESPONSE tests"
      TESTS_GENERATED=$((TESTS_GENERATED + 1))
    else
      echo "   ❌ Failed to save tests"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo "   ❌ Failed to generate tests"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

echo ""
echo "📊 Summary"
echo "=========="
echo "Stories with tests generated: $TESTS_GENERATED"
echo "Stories failed: $TESTS_FAILED"
echo ""

if [ $TESTS_GENERATED -gt 0 ]; then
  echo "✅ Done! Refresh the frontend to see new acceptance tests."
fi
