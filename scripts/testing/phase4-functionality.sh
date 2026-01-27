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
# Story: Display User Stories with Filters and Sorting
# ID: 1769490408847
# =============================================================================
test_story_list_with_status_badges() {
    log_test "Display story list with status badges"
    
    # Test 1: Verify story list button exists
    if ! grep -q "story-list-btn" apps/frontend/public/index.html; then
        fail_test "Story list button not found in HTML"
        return 1
    fi
    
    # Test 2: Verify openStoryListModal function exists
    if ! grep -q "function openStoryListModal" apps/frontend/public/app.js; then
        fail_test "openStoryListModal function not found"
        return 1
    fi
    
    # Test 3: Verify status badge CSS classes exist
    if ! grep -q "status-badge" apps/frontend/public/styles.css; then
        fail_test "Status badge styles not found"
        return 1
    fi
    
    # Test 4: Verify color-coded status badges (Done=green, In Progress=blue, Draft=gray)
    if ! grep -q "status-done" apps/frontend/public/styles.css; then
        fail_test "Done status badge style not found"
        return 1
    fi
    
    if ! grep -q "status-in-progress" apps/frontend/public/styles.css; then
        fail_test "In Progress status badge style not found"
        return 1
    fi
    
    if ! grep -q "status-draft" apps/frontend/public/styles.css; then
        fail_test "Draft status badge style not found"
        return 1
    fi
    
    pass_test "Display story list with status badges"
    return 0
}

test_pagination_controls() {
    log_test "Pagination controls for large story lists"
    
    # Test 1: Verify pagination controls exist in modal
    if ! grep -q "pagination-controls" apps/frontend/public/app.js; then
        fail_test "Pagination controls not found"
        return 1
    fi
    
    # Test 2: Verify ITEMS_PER_PAGE is set to 20
    if ! grep -q "ITEMS_PER_PAGE = 20" apps/frontend/public/app.js; then
        fail_test "ITEMS_PER_PAGE not set to 20"
        return 1
    fi
    
    # Test 3: Verify Previous and Next buttons exist
    if ! grep -q "prev-page" apps/frontend/public/app.js; then
        fail_test "Previous page button not found"
        return 1
    fi
    
    if ! grep -q "next-page" apps/frontend/public/app.js; then
        fail_test "Next page button not found"
        return 1
    fi
    
    # Test 4: Verify pagination CSS exists
    if ! grep -q "pagination-controls" apps/frontend/public/styles.css; then
        fail_test "Pagination controls CSS not found"
        return 1
    fi
    
    pass_test "Pagination controls for large story lists"
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

# Story 1769490408847: Display User Stories with Filters and Sorting
if test_story_list_with_status_badges; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

if test_pagination_controls; then
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
