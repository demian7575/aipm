#!/bin/bash
# Phase 4: Functionality Tests
# This file accumulates all story-specific acceptance tests
# Each merged user story should add its test cases here

set -e
source "$(dirname "$0")/test-library.sh"

echo "🟢 Phase 4: Functionality Tests"
echo "Testing acceptance criteria for all merged stories"
echo ""

# Counter for test results
PHASE4_PASSED=0
PHASE4_FAILED=0

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
# Story: Add Story List Button
# ID: 1769530500613
# =============================================================================
test_story_list_button() {
    log_test "Story List Button - Modal displays when clicked"
    
    # Test 1: Verify button exists in header
    if ! grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
        fail_test "Story list button not found in header"
        return 1
    fi
    
    # Test 2: Verify button has correct label
    if ! grep -q 'Story List' apps/frontend/public/index.html; then
        fail_test "Story list button label incorrect"
        return 1
    fi
    
    # Test 3: Verify openStoryListModal function exists
    if ! grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
        fail_test "openStoryListModal function not found"
        return 1
    fi
    
    # Test 4: Verify event listener is attached
    if ! grep -q "storyListBtn.addEventListener('click'" apps/frontend/public/app.js; then
        fail_test "Event listener not attached to story list button"
        return 1
    fi
    
    # Test 5: Verify modal shows story titles
    if ! grep -q 'story.title' apps/frontend/public/app.js | grep -q 'openStoryListModal' -A 20; then
        fail_test "Modal does not display story titles"
        return 1
    fi
    
    pass_test "Story List Button"
    return 0
}

test_story_list_modal_close() {
    log_test "Story List Modal - Closes when clicking outside"
    
    # Test 1: Verify modal uses openModal function (which has backdrop close)
    if ! grep -q 'openModal({' apps/frontend/public/app.js | grep -q 'openStoryListModal' -A 10; then
        fail_test "Modal does not use standard openModal function"
        return 1
    fi
    
    pass_test "Story List Modal Close"
    return 0
}

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
echo "Running all Phase 4 functionality tests..."
echo ""

if test_remove_hide_completed_button; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

if test_enable_connection_to_parent_user_story; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

if test_story_list_button; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

if test_story_list_modal_close; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

# ADD NEW TEST FUNCTION CALLS HERE
# if test_your_story_name; then
#     ((PHASE4_PASSED++))
# else
#     ((PHASE4_FAILED++))
# fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 4 Summary:"
echo "  ✅ Passed: $PHASE4_PASSED"
echo "  ❌ Failed: $PHASE4_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $PHASE4_FAILED -gt 0 ]]; then
    echo "❌ Phase 4 failed: $PHASE4_FAILED test(s) failed"
    exit 1
fi

echo "✅ Phase 4 completed: all tests passed"
exit 0
