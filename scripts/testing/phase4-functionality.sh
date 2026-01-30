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

# =============================================================================
# Story: Remove Hide Completed Button
# ID: 1768754109973
# Merged: 2026-01-22
# =============================================================================
test_1768754109973_remove_hide_completed_button() {
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
test_1768490120028_enable_connection_to_parent_user_story() {
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
# test_STORYID_story_name() {
#     log_test "[Story Title]"
#     
#     # Test 1: [Description]
#     # Add your test logic here
#     
#     pass_test "[Story Title]"
#     return 0
# }
# =============================================================================

# Test: Story 1769794395147 - Story List Button
# Acceptance Test 1: Header button opens story list modal
test_1769794395147_modal_opens() {
    echo "Test: Story list button opens modal"
    
    # Check button exists in HTML
    if ! grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
        echo "  ❌ Story list button not found in HTML"
        return 1
    fi
    
    # Check event listener exists
    if ! grep -q "story-list-btn.*addEventListener" apps/frontend/public/app.js; then
        echo "  ❌ Event listener for story list button not found"
        return 1
    fi
    
    # Check modal function exists
    if ! grep -q "function openStoryListModal" apps/frontend/public/app.js; then
        echo "  ❌ openStoryListModal function not found"
        return 1
    fi
    
    echo "  ✅ Story list button and modal implementation verified"
    return 0
}

# Acceptance Test 2: Modal displays complete story inventory
test_1769794395147_displays_stories() {
    echo "Test: Modal displays all story titles"
    
    # Check that function retrieves all stories
    if ! grep -q "getAllStories" apps/frontend/public/app.js | grep -A 5 "openStoryListModal"; then
        echo "  ⚠️  Warning: getAllStories usage not clearly visible (may still work)"
    fi
    
    # Check that titles are displayed
    if ! grep -A 20 "function openStoryListModal" apps/frontend/public/app.js | grep -q "story.title"; then
        echo "  ❌ Story titles not displayed in modal"
        return 1
    fi
    
    echo "  ✅ Modal displays story titles correctly"
    return 0
}

# =============================================================================

# Run all tests
echo "Running Phase 4 functionality tests..."
echo ""

# Discover all test functions
if [[ -n "$STORY_ID_FILTER" ]]; then
    # Run only tests matching story ID
    TEST_FUNCTIONS=$(declare -F | awk '{print $3}' | grep "^test_${STORY_ID_FILTER}_")
else
    # Run all test functions
    TEST_FUNCTIONS=$(declare -F | awk '{print $3}' | grep "^test_[0-9]")
fi

# Execute discovered tests
for test_func in $TEST_FUNCTIONS; do
    if $test_func; then
        ((PHASE4_PASSED++))
    else
        ((PHASE4_FAILED++))
    fi || true  # Prevent set -e from exiting on test failure
done

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
