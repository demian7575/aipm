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

# =============================================================================
# Story: Display User Stories in Status-Grouped List View
# ID: 1769445830451
# Merged: 2026-01-26
# =============================================================================
test_display_user_stories_in_status_grouped_list_view() {
    log_test "Display User Stories in Status-Grouped List View"
    
    # Test 1: Verify status grouping implementation
    if ! grep -q 'statusGroups' apps/frontend/public/app.js; then
        fail_test "Status grouping logic not found"
        return 1
    fi
    
    # Test 2: Verify story card elements
    if ! grep -q 'story-title' apps/frontend/public/app.js; then
        fail_test "Story title element not found"
        return 1
    fi
    if ! grep -q 'story-description' apps/frontend/public/app.js; then
        fail_test "Story description element not found"
        return 1
    fi
    if ! grep -q 'story-status-badge' apps/frontend/public/app.js; then
        fail_test "Story status badge element not found"
        return 1
    fi
    
    # Test 3: Verify description truncation
    if ! grep -q 'substring(0, 100)' apps/frontend/public/app.js; then
        fail_test "Description truncation to 100 characters not implemented"
        return 1
    fi
    
    # Test 4: Verify Story List button
    if ! grep -q 'story-list-btn' apps/frontend/public/index.html; then
        fail_test "Story List button not found in HTML"
        return 1
    fi
    
    # Test 5: Verify CSS styles
    if ! grep -q '.story-list-container' apps/frontend/public/styles.css; then
        fail_test "Story list container styles not found"
        return 1
    fi
    
    pass_test "Display User Stories in Status-Grouped List View"
    return 0
}

if test_display_user_stories_in_status_grouped_list_view; then
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

# Story 1769445696592: Display User Stories in Sortable List View with Status
test_story_1769445696592_list_view() {
    log_test "Story 1769445696592 - List View with Pagination"
    
    if ! grep -q "story-list-btn" apps/frontend/public/index.html 2>/dev/null; then
        fail_test "Story List button not found"
        return 1
    fi
    
    if ! grep -q "function openStoryListModal" apps/frontend/public/app.js 2>/dev/null; then
        fail_test "openStoryListModal function not found"
        return 1
    fi
    
    if ! grep -q "const page = parseInt" apps/backend/app.js 2>/dev/null; then
        fail_test "Pagination not implemented in backend"
        return 1
    fi
    
    if ! grep -q "const limit = 20" apps/frontend/public/app.js 2>/dev/null; then
        fail_test "20 items per page limit not set"
        return 1
    fi
    
    pass_test "Story 1769445696592"
    return 0
}

if test_story_1769445696592_list_view; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

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
