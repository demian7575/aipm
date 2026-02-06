#!/bin/bash
# Generate acceptance tests in parallel (10 concurrent processes)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" prod

PARALLEL_JOBS=2  # Match Kiro session pool size
TEMP_DIR="/tmp/test-gen-$$"
mkdir -p "$TEMP_DIR"

echo "🔍 Acceptance Test Generation (Parallel)"
echo "========================================="
echo "Parallel jobs: $PARALLEL_JOBS"
echo ""

# Fetch all stories
echo "📥 Fetching all stories..."
ALL_STORIES=$(curl -s "$API_BASE/api/stories")
FLAT_STORIES=$(echo "$ALL_STORIES" | jq 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten')

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

# Function to process a single story
process_story() {
  local STORY_ID=$1
  local STORY_JSON=$2
  local RESULT_FILE="$TEMP_DIR/result-$STORY_ID.txt"
  
  TITLE=$(echo "$STORY_JSON" | jq -r '.title')
  DESCRIPTION=$(echo "$STORY_JSON" | jq -r '.description // ""')
  
  # Call story-draft API
  DRAFT_RESPONSE=$(curl -s -X POST "$SEMANTIC_API_BASE/api/aipm-story-draft" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg rid "gen-tests-$STORY_ID" --arg t "$TITLE" --arg d "$DESCRIPTION" \
      '{requestId: $rid, title: $t, description: $d}')" 2>&1)
  
  DRAFT_DATA=$(echo "$DRAFT_RESPONSE" | grep "^data: " | tail -1 | sed 's/^data: //')
  
  if echo "$DRAFT_DATA" | jq -e '.acceptanceTests' > /dev/null 2>&1; then
    ACCEPTANCE_TESTS=$(echo "$DRAFT_DATA" | jq -c '.acceptanceTests')
    
    # Create story with tests
    CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/stories" \
      -H 'Content-Type: application/json' \
      -d "$(echo "$STORY_JSON" | jq -c --argjson tests "$ACCEPTANCE_TESTS" \
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
      echo "SUCCESS:$STORY_ID" > "$RESULT_FILE"
    else
      echo "FAILED:$STORY_ID" > "$RESULT_FILE"
    fi
  else
    echo "FAILED:$STORY_ID" > "$RESULT_FILE"
  fi
}

export -f process_story
export TEMP_DIR
export API_BASE
export SEMANTIC_API_BASE

# Process stories in parallel using GNU parallel or background jobs
COUNTER=0
PIDS=()

for STORY_ID in $STORIES_NEEDING_TESTS; do
  STORY_JSON=$(echo "$FLAT_STORIES" | jq -c ".[] | select(.id == $STORY_ID)")
  
  # Run in background
  (
    process_story "$STORY_ID" "$STORY_JSON"
    echo "🧪 Processed story #$STORY_ID"
  ) &
  
  PIDS+=($!)
  COUNTER=$((COUNTER + 1))
  
  # Wait when we hit the parallel limit
  if [ $((COUNTER % PARALLEL_JOBS)) -eq 0 ]; then
    wait
    PIDS=()
  fi
done

# Wait for remaining jobs
wait

# Count results
SUCCESS=$(grep -l "SUCCESS" "$TEMP_DIR"/result-*.txt 2>/dev/null | wc -l | tr -d ' ')
FAILED=$(grep -l "FAILED" "$TEMP_DIR"/result-*.txt 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "📊 Summary"
echo "=========="
echo "Success: $SUCCESS"
echo "Failed: $FAILED"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Done! Refresh the frontend to see new acceptance tests."
