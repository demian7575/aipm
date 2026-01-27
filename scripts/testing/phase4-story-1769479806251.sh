#!/bin/bash
# Phase 4: Story 1769479806251 - Display User Stories with Filters and Sorting
# Acceptance tests for story list feature

set -e
source "$(dirname "$0")/test-library.sh"

echo "🟢 Phase 4: Story 1769479806251 Tests"
echo ""

# Counter for test results
PHASE4_PASSED=0
PHASE4_FAILED=0

test_display_user_stories_list() {
    log_test "Display User Stories with Filters and Sorting"
    
    # Test 1: Verify Story List button exists in HTML
    if ! grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
        fail_test "Story List button not found in HTML"
        return 1
    fi
    
    # Test 2: Verify openStoryListModal function exists
    if ! grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
        fail_test "openStoryListModal function not implemented"
        return 1
    fi
    
    # Test 3: Verify pagination with 20 items per page
    if ! grep -q 'ITEMS_PER_PAGE = 20' apps/frontend/public/app.js; then
        fail_test "Pagination not set to 20 items per page"
        return 1
    fi
    
    # Test 4: Verify table displays title, description, and status columns
    if ! grep -q '<th.*>Title</th>' apps/frontend/public/app.js || \
       ! grep -q '<th.*>Description</th>' apps/frontend/public/app.js || \
       ! grep -q '<th.*>Status</th>' apps/frontend/public/app.js; then
        fail_test "Table does not display all required columns"
        return 1
    fi
    
    pass_test "Display User Stories with Filters and Sorting"
    return 0
}

# Run test
if test_display_user_stories_list; then
    PHASE4_PASSED=$((PHASE4_PASSED + 1))
else
    PHASE4_FAILED=$((PHASE4_FAILED + 1))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Story 1769479806251 Tests Summary:"
echo "  ✅ Passed: $PHASE4_PASSED"
echo "  ❌ Failed: $PHASE4_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $PHASE4_FAILED -gt 0 ]]; then
    echo "❌ Story tests failed"
    exit 1
fi

echo "✅ Story tests passed"
exit 0
