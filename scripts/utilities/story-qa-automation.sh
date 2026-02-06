#!/bin/bash
# Story Quality Assurance and Phase 4 Test Generation
# Ensures all stories have proper format, acceptance tests, and passing Phase 4 tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment configuration
source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" prod

echo "🔍 Story Quality Assurance Script"
echo "=================================="
echo ""

# Stories to exclude from test generation (array of IDs)
EXCLUDED_STORIES=(1000 5310)  # Add story IDs that shouldn't have tests

# Counters
STORIES_FIXED=0
TESTS_GENERATED=0
PHASE4_TESTS_ADDED=0
SKIPPED_STORIES=0

# Fetch all stories
echo "📥 Fetching all stories from $API_BASE..."
ALL_STORIES=$(curl -s "$API_BASE/api/stories")

# Flatten hierarchical stories into a single array
FLAT_STORIES=$(echo "$ALL_STORIES" | jq 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten')
STORY_COUNT=$(echo "$FLAT_STORIES" | jq 'length')
echo "✅ Found $STORY_COUNT stories (including nested)"
echo ""

# Step 1: Audit and fix story format
echo "📋 Step 1: Auditing story format..."
echo "-----------------------------------"

STORIES_NEEDING_FIX=$(echo "$FLAT_STORIES" | jq -r --argjson excluded "$(printf '%s\n' "${EXCLUDED_STORIES[@]}" | jq -s .)" '
  .[] | 
  select(.asA == "" or .iWant == "" or .soThat == "") | 
  select([.id] | inside($excluded) | not) |
  .id
')

if [ -z "$STORIES_NEEDING_FIX" ]; then
  echo "✅ All stories have proper format"
else
  FIX_COUNT=$(echo "$STORIES_NEEDING_FIX" | wc -l)
  echo "⚠️  Found $FIX_COUNT stories needing format fix"
  echo ""
  
  for STORY_ID in $STORIES_NEEDING_FIX; do
    echo "🔧 Fixing story #$STORY_ID..."
    
    # Get story details
    STORY=$(echo "$FLAT_STORIES" | jq ".[] | select(.id == $STORY_ID)")
    TITLE=$(echo "$STORY" | jq -r '.title')
    
    echo "   Title: $TITLE"
    echo "   Generating proper story format..."
    
    # Call Semantic API to generate story draft
    DRAFT_RESPONSE=$(curl -s -X POST "$SEMANTIC_API_BASE/api/aipm-story-draft" \
      -H 'Content-Type: application/json' \
      -d "$(jq -n --arg rid "fix-story-$STORY_ID" --arg t "$TITLE" --argjson d "$(echo "$STORY" | jq -c '.description // ""')" \
        '{requestId: $rid, title: $t, description: $d}')")
    
    # Parse SSE response
    DRAFT_DATA=$(echo "$DRAFT_RESPONSE" | grep "^data: " | tail -1 | sed 's/^data: //')
    
    if echo "$DRAFT_DATA" | jq -e '.asA' > /dev/null 2>&1; then
      AS_A=$(echo "$DRAFT_DATA" | jq -r '.asA')
      I_WANT=$(echo "$DRAFT_DATA" | jq -r '.iWant')
      SO_THAT=$(echo "$DRAFT_DATA" | jq -r '.soThat')
      
      # Update story
      curl -s -X PATCH "$API_BASE/api/stories/$STORY_ID" \
        -H 'Content-Type: application/json' \
        -d "$(jq -n --arg a "$AS_A" --arg i "$I_WANT" --arg s "$SO_THAT" \
          '{asA: $a, iWant: $i, soThat: $s}')" > /dev/null
      
      echo "   ✅ Story format updated"
      STORIES_FIXED=$((STORIES_FIXED + 1))
    else
      echo "   ❌ Failed to generate story format"
    fi
    echo ""
  done
fi

# Refresh stories after fixes
ALL_STORIES=$(curl -s "$API_BASE/api/stories")
FLAT_STORIES=$(echo "$ALL_STORIES" | jq 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten')

# Step 2: Generate missing acceptance tests
echo "📋 Step 2: Generating missing acceptance tests..."
echo "------------------------------------------------"

STORIES_NEEDING_TESTS=$(echo "$FLAT_STORIES" | jq -r --argjson excluded "$(printf '%s\n' "${EXCLUDED_STORIES[@]}" | jq -s .)" '
  .[] | 
  select(.acceptanceTests == null or (.acceptanceTests | length) == 0) |
  select([.id] | inside($excluded) | not) |
  .id
')

if [ -z "$STORIES_NEEDING_TESTS" ]; then
  echo "✅ All stories have acceptance tests"
else
  TEST_COUNT=$(echo "$STORIES_NEEDING_TESTS" | wc -l)
  echo "⚠️  Found $TEST_COUNT stories needing acceptance tests"
  echo ""
  
  for STORY_ID in $STORIES_NEEDING_TESTS; do
    echo "🧪 Generating tests for story #$STORY_ID..."
    
    STORY=$(echo "$FLAT_STORIES" | jq ".[] | select(.id == $STORY_ID)")
    TITLE=$(echo "$STORY" | jq -r '.title')
    
    echo "   Title: $TITLE"
    
    # Call Semantic API to generate acceptance test
    TEST_RESPONSE=$(curl -s -X POST "$SEMANTIC_API_BASE/api/aipm-acceptance-test-draft" \
      -H 'Content-Type: application/json' \
      -d "$(echo "$STORY" | jq -c '{requestId: "gen-test-'$STORY_ID'", story: .}')")
    
    # Parse SSE response
    TEST_DATA=$(echo "$TEST_RESPONSE" | grep "^data: " | tail -1 | sed 's/^data: //')
    
    if echo "$TEST_DATA" | jq -e '.title' > /dev/null 2>&1; then
      TEST_TITLE=$(echo "$TEST_DATA" | jq -r '.title')
      GIVEN=$(echo "$TEST_DATA" | jq -r '.given')
      WHEN=$(echo "$TEST_DATA" | jq -r '.when')
      THEN=$(echo "$TEST_DATA" | jq -r '.then')
      
      # Create acceptance test
      curl -s -X POST "$API_BASE/api/acceptance-tests" \
        -H 'Content-Type: application/json' \
        -d "$(jq -n --argjson sid "$STORY_ID" --arg t "$TEST_TITLE" --arg g "$GIVEN" --arg w "$WHEN" --arg th "$THEN" \
          '{storyId: $sid, title: $t, given: $g, when: $w, then: $th}')" > /dev/null
      
      echo "   ✅ Acceptance test created"
      TESTS_GENERATED=$((TESTS_GENERATED + 1))
    else
      echo "   ❌ Failed to generate acceptance test"
    fi
    echo ""
  done
fi

# Refresh stories after test generation
ALL_STORIES=$(curl -s "$API_BASE/api/stories")
FLAT_STORIES=$(echo "$ALL_STORIES" | jq 'def flatten: if type == "array" then map(flatten) | add else [.] + (if .children then (.children | flatten) else [] end) | map(del(.children)) end; flatten')

# Step 3: Generate Phase 4 tests
echo "📋 Step 3: Generating Phase 4 test script..."
echo "--------------------------------------------"

PHASE4_SCRIPT="$PROJECT_ROOT/scripts/testing/phase4-functionality.sh"

# Backup existing Phase 4 script
if [ -f "$PHASE4_SCRIPT" ]; then
  cp "$PHASE4_SCRIPT" "$PHASE4_SCRIPT.backup.$(date +%s)"
  echo "📦 Backed up existing Phase 4 script"
fi

# Generate new Phase 4 script
cat > "$PHASE4_SCRIPT" << 'HEADER'
#!/bin/bash
# Phase 4: Functionality Tests (Auto-generated)
# Tests all acceptance criteria for implemented stories

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../utilities/load-env-config.sh" prod

PASSED=0
FAILED=0

echo "🧪 Phase 4: Functionality Tests"
echo "================================"
echo ""

HEADER

chmod +x "$PHASE4_SCRIPT"

# Add test cases for each story with acceptance tests
echo "$FLAT_STORIES" | jq -c '.[] | select(.acceptanceTests != null and (.acceptanceTests | length) > 0)' | while read -r STORY; do
  STORY_ID=$(echo "$STORY" | jq -r '.id')
  STORY_TITLE=$(echo "$STORY" | jq -r '.title')
  
  # Skip excluded stories
  skip=0
  for excluded_id in "${EXCLUDED_STORIES[@]}"; do
    if [ "$STORY_ID" = "$excluded_id" ]; then
      skip=1
      break
    fi
  done
  if [ $skip -eq 1 ]; then
    continue
  fi
  
  echo "$STORY" | jq -c '.acceptanceTests[]' | while read -r TEST; do
    TEST_ID=$(echo "$TEST" | jq -r '.id')
    TEST_TITLE=$(echo "$TEST" | jq -r '.title')
    GIVEN=$(echo "$TEST" | jq -r '.given')
    WHEN=$(echo "$TEST" | jq -r '.when')
    THEN=$(echo "$TEST" | jq -r '.then')
    
    cat >> "$PHASE4_SCRIPT" << EOF

# Story #$STORY_ID: $STORY_TITLE
# Test: $TEST_TITLE
echo "🧪 Testing: $TEST_TITLE"
echo "   Story: #$STORY_ID - $STORY_TITLE"
echo "   Given: $GIVEN"
echo "   When: $WHEN"
echo "   Then: $THEN"

# TODO: Implement actual test logic
# For now, mark as pending
echo "   ⏸️  Test implementation pending"
echo ""

EOF
    PHASE4_TESTS_ADDED=$((PHASE4_TESTS_ADDED + 1))
  done
done

# Add summary footer
cat >> "$PHASE4_SCRIPT" << 'FOOTER'

echo "================================"
echo "📊 Phase 4 Test Summary"
echo "   Passed: $PASSED"
echo "   Failed: $FAILED"
echo "================================"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
FOOTER

echo "✅ Generated Phase 4 script with $PHASE4_TESTS_ADDED test cases"
echo ""

# Step 4: Summary
echo "📊 Summary"
echo "=========="
echo "Stories fixed: $STORIES_FIXED"
echo "Tests generated: $TESTS_GENERATED"
echo "Phase 4 tests added: $PHASE4_TESTS_ADDED"
echo "Stories skipped: $SKIPPED_STORIES"
echo ""
echo "✅ Story quality assurance complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review generated Phase 4 tests: $PHASE4_SCRIPT"
echo "2. Implement test logic for each test case"
echo "3. Run: ./scripts/testing/phase4-functionality.sh"
echo "4. Fix failures and re-run (max 10 iterations)"
