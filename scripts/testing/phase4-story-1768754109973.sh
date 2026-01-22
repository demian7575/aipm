#!/bin/bash
# Phase 4 Story-Specific Test: Remove Hide Completed Button
# Story ID: 1768754109973

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1768754109973"
STORY_TITLE="Remove Hide Completed Button"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Acceptance Test 1: Verify Hide Completed button is removed
# Given: the application is loaded
# When: I view the interface
# Then: the Hide Completed button is not visible
echo "    ✓ Test 1: Verifying Hide Completed button is removed from HTML..."
if grep -q 'id="hide-completed-btn"' apps/frontend/public/index.html; then
  fail_test "Hide Completed button still exists in HTML"
fi

echo "    ✓ Test 1: Verifying hideCompletedBtn variable is removed from JS..."
if grep -q 'const hideCompletedBtn' apps/frontend/public/app.js; then
  fail_test "hideCompletedBtn variable still exists in app.js"
fi

echo "    ✓ Test 1: Verifying hideCompleted state is removed..."
if grep -q 'hideCompleted:' apps/frontend/public/app.js; then
  fail_test "hideCompleted state still exists in app.js"
fi

# Acceptance Test 2: Verify Filter button handles completed items
# Given: there are completed items
# When: I use the Filter button
# Then: I can filter completed items using the Filter button
echo "    ✓ Test 2: Verifying Filter button still exists..."
if ! grep -q 'id="filter-btn"' apps/frontend/public/index.html; then
  fail_test "Filter button was removed from HTML"
fi

echo "    ✓ Test 2: Verifying filter functionality is intact..."
if ! grep -q 'state.filters.status' apps/frontend/public/app.js; then
  fail_test "Filter status functionality is missing"
fi

pass_test "Story $STORY_ID acceptance tests"

echo "  ✅ Story $STORY_ID tests passed"
