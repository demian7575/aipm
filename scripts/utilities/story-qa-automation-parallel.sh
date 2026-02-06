#!/bin/bash
# Story Quality Assurance - Parallel version with better error handling
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" prod

echo "🔍 Story Quality Assurance Script (Parallel)"
echo "============================================="
echo ""

# Fetch all stories
echo "📥 Fetching all stories..."
ALL_STORIES=$(curl -s "$API_BASE/api/stories")
FLAT_STORIES=$(echo "$ALL_STORIES" | jq 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten')
STORY_COUNT=$(echo "$FLAT_STORIES" | jq 'length')
echo "✅ Found $STORY_COUNT stories"
echo ""

# Step 2: Generate missing acceptance tests (skip format fixes for now)
echo "📋 Generating missing acceptance tests..."
echo "-----------------------------------------"

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
  echo "🧪 [$((TESTS_GENERATED + TESTS_FAILED + 1))/$TEST_COUNT] Generating test for story #$STORY_ID..."
  
  STORY=$(echo "$FLAT_STORIES" | jq ".[] | select(.id == $STORY_ID)")
  TITLE=$(echo "$STORY" | jq -r '.title')
  
  # Call Semantic API
  TEST_RESPONSE=$(curl -s -X POST "$SEMANTIC_API_BASE/api/aipm-acceptance-test-draft" \
    -H 'Content-Type: application/json' \
    -d "$(echo "$STORY" | jq -c '{requestId: "gen-test-'$STORY_ID'", story: .}')" 2>&1)
  
  # Parse response
  TEST_DATA=$(echo "$TEST_RESPONSE" | grep "^data: " | tail -1 | sed 's/^data: //')
  
  if echo "$TEST_DATA" | jq -e '.title' > /dev/null 2>&1; then
    TEST_TITLE=$(echo "$TEST_DATA" | jq -r '.title')
    GIVEN=$(echo "$TEST_DATA" | jq -c '.given')
    WHEN=$(echo "$TEST_DATA" | jq -c '.when')
    THEN=$(echo "$TEST_DATA" | jq -c '.then')
    
    # Create acceptance test
    CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/acceptance-tests" \
      -H 'Content-Type: application/json' \
      -d "$(jq -n --argjson sid "$STORY_ID" --arg t "$TEST_TITLE" --argjson g "$GIVEN" --argjson w "$WHEN" --argjson th "$THEN" \
        '{storyId: $sid, title: $t, given: $g, when: $w, then: $th}')" 2>&1)
    
    if echo "$CREATE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
      echo "   ✅ Test created: $TEST_TITLE"
      TESTS_GENERATED=$((TESTS_GENERATED + 1))
    else
      echo "   ❌ Failed to create test in database"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo "   ❌ Failed to generate test"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

echo ""
echo "📊 Summary"
echo "=========="
echo "Tests generated: $TESTS_GENERATED"
echo "Tests failed: $TESTS_FAILED"
echo ""
echo "✅ Done! Run Phase 4 test generation next."
