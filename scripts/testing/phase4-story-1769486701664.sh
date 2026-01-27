#!/bin/bash
# Phase 4 Story-Specific Test: Display User Stories with Filters and Sorting
# Story ID: 1769486701664

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1769486701664"
STORY_TITLE="Display User Stories with Filters and Sorting"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Display story list with status badges
echo "    ✓ Checking story list modal exists..."
if ! grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  fail_test "Story list modal function not found"
fi
if ! grep -q 'story-list-btn' apps/frontend/public/index.html; then
  fail_test "Story List button not found in header"
fi

# Test 2: Verify status badge rendering
echo "    ✓ Verifying status badge rendering..."
if ! grep -q 'status-draft.*bg.*color' apps/frontend/public/app.js; then
  fail_test "Status badge colors not defined"
fi
if ! grep -q 'status-ready.*bg.*color' apps/frontend/public/app.js; then
  fail_test "Ready status badge not found"
fi
if ! grep -q 'status-in-progress.*bg.*color' apps/frontend/public/app.js; then
  fail_test "In Progress status badge not found"
fi
if ! grep -q 'status-done.*bg.*color' apps/frontend/public/app.js; then
  fail_test "Done status badge not found"
fi

# Test 3: Pagination displays 20 stories per page
echo "    ✓ Checking pagination logic..."
if ! grep -q 'ITEMS_PER_PAGE = 20' apps/frontend/public/app.js; then
  fail_test "Items per page not set to 20"
fi
if ! grep -q 'currentPage' apps/frontend/public/app.js; then
  fail_test "Current page tracking not found"
fi
if ! grep -q 'prev-page' apps/frontend/public/app.js; then
  fail_test "Previous page button not found"
fi
if ! grep -q 'next-page' apps/frontend/public/app.js; then
  fail_test "Next page button not found"
fi

# Test 4: Verify filtering by status
echo "    ✓ Verifying status filter..."
if ! grep -q 'status-filter' apps/frontend/public/app.js; then
  fail_test "Status filter dropdown not found"
fi
if ! grep -q 'statusFilter' apps/frontend/public/app.js; then
  fail_test "Status filter variable not found"
fi

# Test 5: Verify sorting functionality
echo "    ✓ Checking sorting controls..."
if ! grep -q 'sort-by' apps/frontend/public/app.js; then
  fail_test "Sort by dropdown not found"
fi
if ! grep -q 'sort-order' apps/frontend/public/app.js; then
  fail_test "Sort order dropdown not found"
fi
if ! grep -q 'sortBy' apps/frontend/public/app.js; then
  fail_test "Sort by variable not found"
fi

# Test 6: Verify truncated description (100 chars max)
echo "    ✓ Verifying description truncation..."
if ! grep -q 'substring(0, 100)' apps/frontend/public/app.js; then
  fail_test "Description truncation to 100 chars not found"
fi

# Test 7: Verify row click navigation
echo "    ✓ Checking row click to view details..."
if ! grep -q 'data-story-id' apps/frontend/public/app.js; then
  fail_test "Story ID data attribute not found on rows"
fi
if ! grep -q 'state.selectedStoryId = storyId' apps/frontend/public/app.js; then
  fail_test "Story selection on row click not found"
fi

pass_test "Story $STORY_ID acceptance tests"
