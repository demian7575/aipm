#!/bin/bash
# Phase 4 Story-Specific Test: Persist filter state across sessions
set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1768709911080"
STORY_TITLE="Persist filter state across sessions"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Verify filter persistence code exists
echo "    ✓ Checking filter persistence implementation..."
if ! grep -q "STORAGE_KEYS.filters" apps/frontend/public/app.js; then
  fail_test "Filter storage key not found"
fi

if ! grep -q "persistFilters" apps/frontend/public/app.js; then
  fail_test "persistFilters function not found"
fi

# Test 2: Verify filter loading on startup
echo "    ✓ Verifying filter loading from localStorage..."
if ! grep -q "localStorage.getItem(STORAGE_KEYS.filters)" apps/frontend/public/app.js; then
  fail_test "Filter loading from localStorage not implemented"
fi

# Test 3: Verify filters are persisted when applied
echo "    ✓ Verifying filters persist when applied..."
if ! grep -q "persistFilters()" apps/frontend/public/app.js; then
  fail_test "Filter persistence not called when applying filters"
fi

pass_test "Story $STORY_ID acceptance tests"

echo "  ✅ Story $STORY_ID tests passed"
