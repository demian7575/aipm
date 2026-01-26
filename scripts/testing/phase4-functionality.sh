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
# Story: Updated: User Authentication with OAuth2
# ID: 1769433443298
# Merged: 2026-01-26
# =============================================================================
test_updated_user_authentication_with_oauth2() {
    log_test "Updated: User Authentication with OAuth2"
    
    # Test 1: Story List button exists in HTML
    if ! grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
        fail_test "Story List button not found in HTML"
        return 1
    fi
    
    # Test 2: Story List modal function exists
    if ! grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
        fail_test "openStoryListModal function not implemented"
        return 1
    fi
    
    # Test 3: Story list CSS styles exist
    if ! grep -q '.story-list-table' apps/frontend/public/styles.css; then
        fail_test "Story list CSS not found"
        return 1
    fi
    
    pass_test "Updated: User Authentication with OAuth2"
    return 0
}

# =============================================================================
# Story: Updated: User Authentication with OAuth2
# ID: 1769441996419
# Merged: $(date +%Y-%m-%d)
# =============================================================================
test_updated_user_authentication_with_oauth2() {
    log_test "Updated: User Authentication with OAuth2"
    
    # Test 1: Check if list view toggle exists in HTML
    if ! grep -q "toggle-list" apps/frontend/public/index.html; then
        fail_test "List view toggle not found in HTML"
        return 1
    fi
    
    # Test 2: Check if renderStoryList function exists
    if ! grep -q "function renderStoryList" apps/frontend/public/app.js; then
        fail_test "renderStoryList function not implemented"
        return 1
    fi
    
    # Test 3: Check if story list table exists
    if ! grep -q "story-list-table" apps/frontend/public/index.html; then
        fail_test "Story list table not found"
        return 1
    fi
    
    pass_test "Updated: User Authentication with OAuth2"
    return 0
}

# =============================================================================
# Story: Remove Dependencies Label from Story Details View
# ID: 1769414380405
# Merged: $(date +%Y-%m-%d)
# =============================================================================
test_remove_dependencies_label_from_story_details_view() {
    log_test "Remove Dependencies Label from Story Details View"
    
    # Test 1: Check if upstream group heading is hidden
    if ! grep -q "if (group.key !== 'upstream')" apps/frontend/public/app.js; then
        fail_test "Logic to hide upstream Dependencies heading not found"
        return 1
    fi
    
    # Test 2: Verify Dependencies title still exists in data structure
    if ! grep -q "title: 'Dependencies'" apps/frontend/public/app.js; then
        fail_test "Dependencies title removed from data structure"
        return 1
    fi
    
    pass_test "Remove Dependencies Label from Story Details View"
    return 0
}

# =============================================================================
# Story: Remove Dependencies Label from Story Details View
# ID: 1769414380405
# Merged: $(date +%Y-%m-%d)
# =============================================================================
test_remove_dependencies_label_from_story_details_view_1769443333505() {
    log_test "Remove Dependencies Label from Story Details View (1769443333505)"
    
    # Test 1: Check if upstream group heading is hidden
    if ! grep -q "if (group.key !== 'upstream')" apps/frontend/public/app.js; then
        fail_test "Logic to hide upstream Dependencies heading not found"
        return 1
    fi
    
    # Test 2: Verify Dependencies title still exists in data structure
    if ! grep -q "title: 'Dependencies'" apps/frontend/public/app.js; then
        fail_test "Dependencies title removed from data structure"
        return 1
    fi
    
    pass_test "Remove Dependencies Label from Story Details View (1769443333505)"
    return 0
}

# =============================================================================
# Story: Display SSE Status Indicator During User Story Creation
# ID: 1769414634981
# Merged: $(date +%Y-%m-%d)
# =============================================================================
test_display_sse_status_indicator_during_user_story_creation() {
    log_test "Display SSE Status Indicator During User Story Creation"
    
    # Test 1: Check if updateSSEStatus function exists
    if ! grep -q "function updateSSEStatus" apps/frontend/public/app.js; then
        fail_test "updateSSEStatus function not found"
        return 1
    fi
    
    # Test 2: Check if SSE status indicator is added to modal
    if ! grep -q "sse-status-indicator" apps/frontend/public/app.js; then
        fail_test "SSE status indicator not added to modal"
        return 1
    fi
    
    # Test 3: Check if CSS for SSE status exists
    if ! grep -q "\.sse-status" apps/frontend/public/styles.css; then
        fail_test "SSE status CSS not found"
        return 1
    fi
    
    pass_test "Display SSE Status Indicator During User Story Creation"
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

if test_display_sse_status_indicator_during_user_story_creation; then
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
