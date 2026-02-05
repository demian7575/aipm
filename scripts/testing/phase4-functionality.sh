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
# Story: Add Root Story and Skip INVEST Options to Child Story Modal
# ID: 1770116995784
# Merged: 2026-02-03
# =============================================================================
test_1770116995784_add_root_story_and_skip_invest_options() {
    log_test "Add Root Story and Skip INVEST Options to Child Story Modal"
    
    # Test 1: Verify "Create as root story" checkbox exists
    if ! grep -q 'child-create-as-root' apps/frontend/public/app.js; then
        fail_test "Create as root story checkbox not found"
        return 1
    fi
    
    # Test 2: Verify "Skip INVEST" checkbox exists
    if ! grep -q 'child-skip-invest' apps/frontend/public/app.js; then
        fail_test "Skip INVEST checkbox not found"
        return 1
    fi
    
    # Test 3: Verify parentId uses checkbox value
    if ! grep -q "child-create-as-root.*checked.*null.*parentId" apps/frontend/public/app.js; then
        fail_test "Create as root checkbox not wired to parentId"
        return 1
    fi
    
    # Test 4: Verify acceptWarnings uses checkbox value
    if ! grep -q "acceptWarnings.*child-skip-invest.*checked" apps/frontend/public/app.js; then
        fail_test "Skip INVEST checkbox not wired to acceptWarnings"
        return 1
    fi
    
    pass_test "Add Root Story and Skip INVEST Options to Child Story Modal"
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

# =============================================================================
# Story: Add Story List Button
# ID: 1770251581797
# =============================================================================
test_1770251581797_add_story_list_button() {
    log_test "Add Story List Button"
    
    # Test 1: Verify button exists in header
    if ! grep -q 'id="view-stories-btn"' apps/frontend/public/index.html; then
        fail_test "View Stories button not found in header"
        return 1
    fi
    
    # Test 2: Verify button element is declared
    if ! grep -q 'viewStoriesBtn' apps/frontend/public/app.js; then
        fail_test "viewStoriesBtn not declared in app.js"
        return 1
    fi
    
    # Test 3: Verify event listener exists
    if ! grep -q 'viewStoriesBtn.addEventListener' apps/frontend/public/app.js; then
        fail_test "viewStoriesBtn event listener not found"
        return 1
    fi
    
    # Test 4: Verify showStoriesModal function exists
    if ! grep -q 'function showStoriesModal' apps/frontend/public/app.js; then
        fail_test "showStoriesModal function not found"
        return 1
    fi
    
    pass_test "Add Story List Button"
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
