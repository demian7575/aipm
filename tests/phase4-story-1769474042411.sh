#!/bin/bash
# Acceptance tests for Story 1769474042411
# Story: Display user stories in list view with pagination

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Story 1769474042411: List View with Pagination ==="

# Test 1: Display story list with all required columns
echo "Test 1: Display story list with all required columns"
# Given: 5 user stories exist in the system with different statuses
# When: User navigates to the story list page
# Then: All 5 stories are displayed in a table
#       Each row shows title, description, and status columns
#       Pagination shows page 1 of 1

# Verify list view elements exist in HTML
if ! grep -q 'id="story-list-view"' "$PROJECT_ROOT/apps/frontend/public/index.html"; then
  echo "❌ FAIL: story-list-view element not found in HTML"
  exit 1
fi

if ! grep -q 'id="story-list-container"' "$PROJECT_ROOT/apps/frontend/public/index.html"; then
  echo "❌ FAIL: story-list-container element not found in HTML"
  exit 1
fi

if ! grep -q 'id="story-list-pagination"' "$PROJECT_ROOT/apps/frontend/public/index.html"; then
  echo "❌ FAIL: story-list-pagination element not found in HTML"
  exit 1
fi

# Verify list view toggle button exists
if ! grep -q 'id="toggle-list-view"' "$PROJECT_ROOT/apps/frontend/public/index.html"; then
  echo "❌ FAIL: toggle-list-view button not found in HTML"
  exit 1
fi

# Verify CSS styles for list view
if ! grep -q '.story-list-view' "$PROJECT_ROOT/apps/frontend/public/styles.css"; then
  echo "❌ FAIL: story-list-view styles not found in CSS"
  exit 1
fi

if ! grep -q '.story-list-item' "$PROJECT_ROOT/apps/frontend/public/styles.css"; then
  echo "❌ FAIL: story-list-item styles not found in CSS"
  exit 1
fi

# Verify JavaScript functions exist
if ! grep -q 'function renderListView' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: renderListView function not found in JavaScript"
  exit 1
fi

if ! grep -q 'function toggleListView' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: toggleListView function not found in JavaScript"
  exit 1
fi

# Verify state properties
if ! grep -q 'listViewMode:' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: listViewMode state property not found"
  exit 1
fi

if ! grep -q 'listViewPage:' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: listViewPage state property not found"
  exit 1
fi

echo "✅ PASS: Test 1 - List view structure and functions implemented"

# Test 2: Pagination displays 20 stories per page
echo "Test 2: Pagination displays 20 stories per page"
# Given: 25 user stories exist in the system
# When: User opens the story list page
# Then: First 20 stories are displayed on page 1
#       Pagination controls show page 1 of 2
#       Clicking page 2 displays the remaining 5 stories

# Verify page size constant
if ! grep -q 'listViewPageSize: 20' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: listViewPageSize not set to 20"
  exit 1
fi

# Verify pagination logic exists
if ! grep -q 'state.listViewPageSize' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: Pagination logic not found"
  exit 1
fi

# Verify pagination controls rendering
if ! grep -q 'pagination-controls' "$PROJECT_ROOT/apps/frontend/public/styles.css"; then
  echo "❌ FAIL: pagination-controls styles not found"
  exit 1
fi

# Verify Previous/Next button logic
if ! grep -q 'Previous' "$PROJECT_ROOT/apps/frontend/public/app.js" && \
   ! grep -q 'Next' "$PROJECT_ROOT/apps/frontend/public/app.js"; then
  echo "❌ FAIL: Pagination button logic not found"
  exit 1
fi

echo "✅ PASS: Test 2 - Pagination with 20 items per page implemented"

echo ""
echo "=== ✅ ALL TESTS PASSED for Story 1769474042411 ==="
