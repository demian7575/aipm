#!/bin/bash
# Phase 4: Functionality Tests
# This file accumulates all story-specific acceptance tests
# Each merged user story should add its test cases here
#
# Usage: 
#   ./phase4-functionality.sh           # Run all tests
#   ./phase4-functionality.sh {storyId} # Run only tests for specific story

set -e
source "$(dirname "$0")/test-library.sh"

# Get optional story ID filter
STORY_ID_FILTER="$1"

if [[ -n "$STORY_ID_FILTER" ]]; then
    echo "🟢 Phase 4: Functionality Tests (Story ID: $STORY_ID_FILTER)"
    echo "Testing acceptance criteria for story $STORY_ID_FILTER"
else
    echo "🟢 Phase 4: Functionality Tests"
    echo "Testing acceptance criteria for all merged stories"
fi
echo ""

# Counter for test results
PHASE4_PASSED=0
PHASE4_FAILED=0

# Helper function to check if test should run
should_run_test() {
    local test_story_id="$1"
    if [[ -z "$STORY_ID_FILTER" ]]; then
        return 0  # No filter, run all tests
    fi
    if [[ "$test_story_id" == "$STORY_ID_FILTER" ]]; then
        return 0  # Matches filter
    fi
    return 1  # Skip this test
}

# =============================================================================
# Story: Remove Hide Completed Button
# ID: 1768754109973
# Merged: 2026-01-22
# =============================================================================
test_remove_hide_completed_button() {
    log_test "Remove Hide Completed Button"
    
    # Test 1: Verify Hide Completed button is removed
    if grep -qi "hide.*completed" apps/frontend/public/index.html 2>/dev/null; then
        fail_test "Hide Completed button still exists in HTML"
        return 1
    fi
    
    # Test 2: Verify hideCompleted state is removed from code
    if grep -q "state.hideCompleted" apps/frontend/public/app.js 2>/dev/null; then
        fail_test "state.hideCompleted still referenced in app.js"
        return 1
    fi
    
    # Test 3: Verify syncHideCompletedControls is removed
    if grep -q "syncHideCompletedControls" apps/frontend/public/app.js 2>/dev/null; then
        fail_test "syncHideCompletedControls still referenced in app.js"
        return 1
    fi
    
    pass_test "Remove Hide Completed Button"
    return 0
}

# =============================================================================
# ADD NEW STORY TESTS BELOW THIS LINE

# =============================================================================
# Story: Enable connection to parent User Story
# ID: 1768490120028
# Merged: 2026-01-23
# =============================================================================
test_enable_connection_to_parent_user_story() {
    log_test "Enable connection to parent User Story"
    
    # Test 1: Verify parent ID input field exists in frontend
    if ! grep -q 'id="parent-id-input"' apps/frontend/public/app.js; then
        fail_test "Parent ID input field not found in frontend"
        return 1
    fi
    
    # Test 2: Verify input field syncs with dropdown
    if ! grep -q 'parentInput.addEventListener' apps/frontend/public/app.js; then
        fail_test "Parent ID input sync logic not implemented"
        return 1
    fi
    
    # Test 3: Verify form submission uses typed parent ID
    if ! grep -q "formData.get('parentIdInput')" apps/frontend/public/app.js; then
        fail_test "Form submission does not use typed parent ID"
        return 1
    fi
    
    # Test 4: Verify backend update supports parentId
    if ! grep -q 'parentId = :parentId' apps/backend/app.js; then
        fail_test "Backend DynamoDB update does not include parentId"
        return 1
    fi
    if ! grep -q 'parent_id = \\?' apps/backend/app.js; then
        fail_test "Backend SQLite update does not include parent_id"
        return 1
    fi
    
    pass_test "Enable connection to parent User Story"
    return 0
}
# Template:
# =============================================================================
# Story: [Story Title]
# ID: [Story ID]
# Merged: [Date]
# =============================================================================
# test_story_name() {
#     log_test "[Story Title]"
#     
#     # Test 1: [Description]
#     # Add your test logic here
#     
#     pass_test "[Story Title]"
#     return 0
# }
# =============================================================================

# Run all tests
echo "Running Phase 4 functionality tests..."
echo ""

if should_run_test "1768754109973"; then
    if test_remove_hide_completed_button; then
        ((PHASE4_PASSED++))
    else
        ((PHASE4_FAILED++))
    fi
fi

if should_run_test "1768490120028"; then
    if test_enable_connection_to_parent_user_story; then
        ((PHASE4_PASSED++))
    else
        ((PHASE4_FAILED++))
    fi
fi

# ADD NEW TEST FUNCTION CALLS HERE
# if should_run_test "STORY_ID"; then
#     if test_your_story_name; then
#         ((PHASE4_PASSED++))
#     else
#         ((PHASE4_FAILED++))
#     fi
# fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -n "$STORY_ID_FILTER" ]]; then
    echo "Phase 4 Summary (Story $STORY_ID_FILTER):"
else
    echo "Phase 4 Summary:"
fi
echo "  ✅ Passed: $PHASE4_PASSED"
echo "  ❌ Failed: $PHASE4_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $PHASE4_FAILED -gt 0 ]]; then
    echo "❌ Phase 4 failed: $PHASE4_FAILED test(s) failed"
    exit 1
fi

if [[ $PHASE4_PASSED -eq 0 ]] && [[ -n "$STORY_ID_FILTER" ]]; then
    echo "⚠️  No tests found for story ID: $STORY_ID_FILTER"
    echo "✅ Phase 4 completed (no tests to run)"
    exit 0
fi

echo "✅ Phase 4 completed: all tests passed"
exit 0
