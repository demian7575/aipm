#!/bin/bash
# Phase 4 Story-Specific Test: Display User Stories with Filters and Sorting
# Story ID: 1769501187649

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1769501187649"
STORY_TITLE="Display User Stories with Filters and Sorting"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Display story list with status column and pagination
echo "    ✓ Checking story list page exists..."
if [ ! -f "apps/frontend/public/story-list.html" ]; then
  fail_test "Story list HTML file not found"
fi

echo "    ✓ Verifying table format with title, description, and status columns..."
if ! grep -q '<th>Title</th>' apps/frontend/public/story-list.html; then
  fail_test "Title column not found in story list table"
fi
if ! grep -q '<th>Description</th>' apps/frontend/public/story-list.html; then
  fail_test "Description column not found in story list table"
fi
if ! grep -q '<th>Status</th>' apps/frontend/public/story-list.html; then
  fail_test "Status column not found in story list table"
fi

echo "    ✓ Checking pagination controls..."
if ! grep -q 'pagination' apps/frontend/public/story-list.html; then
  fail_test "Pagination controls not found"
fi
if ! grep -q 'limit: 20' apps/frontend/public/story-list.html; then
  fail_test "20 items per page limit not configured"
fi

echo "    ✓ Verifying status color coding..."
if ! grep -q 'status-Done.*green' apps/frontend/public/story-list.html; then
  fail_test "Done status color coding (green) not found"
fi
if ! grep -q 'status-In-Progress.*blue' apps/frontend/public/story-list.html; then
  fail_test "In Progress status color coding (blue) not found"
fi
if ! grep -q 'status-Ready.*yellow' apps/frontend/public/story-list.html; then
  fail_test "Ready status color coding (yellow) not found"
fi
if ! grep -q 'status-Draft.*gray' apps/frontend/public/story-list.html; then
  fail_test "Draft status color coding (gray) not found"
fi

# Test 2: Navigate to story details from list
echo "    ✓ Checking row click navigation..."
if ! grep -q 'window.location.href.*index.html.*story' apps/frontend/public/story-list.html; then
  fail_test "Story row click navigation not implemented"
fi

# Test 3: Backend API supports filtering and sorting
echo "    ✓ Verifying backend filtering support..."
if ! grep -q 'statusFilter' apps/backend/app.js; then
  fail_test "Status filter not implemented in backend"
fi

echo "    ✓ Verifying backend sorting support..."
if ! grep -q 'sortBy' apps/backend/app.js; then
  fail_test "Sorting not implemented in backend"
fi

echo "    ✓ Checking pagination in backend..."
if ! grep -q 'page.*limit' apps/backend/app.js; then
  fail_test "Pagination not implemented in backend"
fi

# Test 4: Frontend filters and sorting controls
echo "    ✓ Verifying status filter dropdown..."
if ! grep -q 'statusFilter' apps/frontend/public/story-list.html; then
  fail_test "Status filter dropdown not found"
fi

echo "    ✓ Verifying sort dropdown..."
if ! grep -q 'sortBy' apps/frontend/public/story-list.html; then
  fail_test "Sort dropdown not found"
fi

# Test 5: Navigation button in main page
echo "    ✓ Checking Story List button in header..."
if ! grep -q 'story-list.html' apps/frontend/public/index.html; then
  fail_test "Story List navigation button not found in main page"
fi

pass_test "Story $STORY_ID acceptance tests"

echo "  ✅ Story $STORY_ID tests passed"
