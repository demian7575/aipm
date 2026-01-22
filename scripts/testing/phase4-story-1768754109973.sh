#!/bin/bash
# Phase 4 Story-Specific Test: Remove Hide Completed Button
# Story ID: 1768754109973

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1768754109973"
STORY_TITLE="Remove Hide Completed Button"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Verify Hide Completed button is removed
echo "    ✓ Checking Hide Completed button is not in HTML..."
if grep -qi "hide.*completed" apps/frontend/public/index.html 2>/dev/null; then
  fail_test "Hide Completed button still exists in HTML"
fi

# Test 2: Verify hideCompleted state is removed from code
echo "    ✓ Verifying hideCompleted references removed from app.js..."
if grep -q "state.hideCompleted" apps/frontend/public/app.js 2>/dev/null; then
  fail_test "state.hideCompleted still referenced in app.js"
fi

# Test 3: Verify syncHideCompletedControls is removed
echo "    ✓ Verifying syncHideCompletedControls removed..."
if grep -q "syncHideCompletedControls" apps/frontend/public/app.js 2>/dev/null; then
  fail_test "syncHideCompletedControls still referenced in app.js"
fi

# Test 4: Verify Filter button still exists
echo "    ✓ Verifying Filter button exists..."
if ! grep -q "filter-btn" apps/frontend/public/index.html 2>/dev/null; then
  fail_test "Filter button not found in HTML"
fi

pass_test "Story $STORY_ID acceptance tests"

echo "  ✅ Story $STORY_ID tests passed"
