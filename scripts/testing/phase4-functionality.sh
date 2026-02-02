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
# Story: Add Story List Button
# ID: 1770049576976
# Merged: 2026-02-02
# =============================================================================
test_1770049576976_add_story_list_button() {
    log_test "Add Story List Button"
    
    # Test 1: Verify story list button exists in HTML
    if ! grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
        fail_test "Story list button not found in HTML"
        return 1
    fi
    
    # Test 2: Verify button element reference in app.js
    if ! grep -q 'storyListBtn' apps/frontend/public/app.js; then
        fail_test "storyListBtn reference not found in app.js"
        return 1
    fi
    
    # Test 3: Verify click handler exists
    if ! grep -q 'storyListBtn.addEventListener' apps/frontend/public/app.js; then
        fail_test "Story list button click handler not found"
        return 1
    fi
    
    # Test 4: Verify modal opens with story list
    if ! grep -A 10 'storyListBtn.addEventListener' apps/frontend/public/app.js | grep -q "All Stories"; then
        fail_test "Modal does not display story list"
        return 1
    fi
    
    pass_test "Add Story List Button"
    return 0
}

# =============================================================================
# Story: Kanban Board View with Drag-and-Drop
# ID: 1770031875840
# Merged: 2026-02-02
# =============================================================================
test_1770031875840_kanban_board_view_with_drag_and_drop() {
    log_test "Kanban Board View with Drag-and-Drop"
    
    # Test 1: Verify Kanban view tab exists in HTML
    if ! grep -q 'data-view="kanban"' apps/frontend/public/index.html; then
        fail_test "Kanban view tab not found in HTML"
        return 1
    fi
    
    # Test 2: Verify Kanban board container exists
    if ! grep -q 'kanban-board' apps/frontend/public/index.html; then
        fail_test "Kanban board container not found in HTML"
        return 1
    fi
    
    # Test 3: Verify renderKanban function exists
    if ! grep -q 'function renderKanban' apps/frontend/public/app.js; then
        fail_test "renderKanban function not found in app.js"
        return 1
    fi
    
    # Test 4: Verify drag-and-drop handlers exist
    if ! grep -q 'handleKanbanDragStart' apps/frontend/public/app.js; then
        fail_test "Drag start handler not found"
        return 1
    fi
    if ! grep -q 'handleKanbanDragEnd' apps/frontend/public/app.js; then
        fail_test "Drag end handler not found"
        return 1
    fi
    
    # Test 5: Verify updateStoryStatus function exists
    if ! grep -q 'async function updateStoryStatus' apps/frontend/public/app.js; then
        fail_test "updateStoryStatus function not found"
        return 1
    fi
    
    # Test 6: Verify Kanban styles exist
    if ! grep -q '.kanban-board' apps/frontend/public/styles.css; then
        fail_test "Kanban board styles not found"
        return 1
    fi
    if ! grep -q '.kanban-card' apps/frontend/public/styles.css; then
        fail_test "Kanban card styles not found"
        return 1
    fi
    
    pass_test "Kanban Board View with Drag-and-Drop"
    return 0
}

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
