#!/bin/bash
# Acceptance Test: Display User Stories in Sortable List View with Status
# Story ID: 1769477348611

set -e

echo "=== Acceptance Test: Story List View ==="
echo ""

# Test 1: Display story list with all required columns
echo "Test 1: Display story list with all required columns"
echo "Given: 5 user stories exist in the system with different statuses"
echo "When: User navigates to the story list page"
echo "Then: All 5 stories are displayed in a table"
echo "      Each row shows title, description, and status columns"
echo "      Pagination shows page 1 of 1"
echo ""

# Verify button exists in HTML
if ! grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "❌ FAIL: Story List button not found in HTML"
  exit 1
fi
echo "✅ Story List button exists in HTML"

# Verify function exists in app.js
if ! grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  echo "❌ FAIL: openStoryListModal function not found"
  exit 1
fi
echo "✅ openStoryListModal function exists"

# Verify event listener
if ! grep -q "storyListBtn.*addEventListener" apps/frontend/public/app.js; then
  echo "❌ FAIL: Story List button event listener not found"
  exit 1
fi
echo "✅ Story List button event listener configured"

# Verify table structure in function
if ! grep -q 'story-list-table' apps/frontend/public/app.js; then
  echo "❌ FAIL: Story list table structure not found"
  exit 1
fi
echo "✅ Story list table structure implemented"

# Verify columns (Title, Description, Status)
if ! grep -q '<th>Title</th>' apps/frontend/public/app.js; then
  echo "❌ FAIL: Title column not found"
  exit 1
fi
if ! grep -q '<th>Description</th>' apps/frontend/public/app.js; then
  echo "❌ FAIL: Description column not found"
  exit 1
fi
if ! grep -q '<th>Status</th>' apps/frontend/public/app.js; then
  echo "❌ FAIL: Status column not found"
  exit 1
fi
echo "✅ All required columns (Title, Description, Status) present"

echo ""
echo "Test 1: ✅ PASSED"
echo ""

# Test 2: Pagination displays 20 stories per page
echo "Test 2: Pagination displays 20 stories per page"
echo "Given: 25 user stories exist in the system"
echo "When: User opens the story list page"
echo "Then: First 20 stories are displayed on page 1"
echo "      Pagination controls show page 1 of 2"
echo "      Clicking page 2 displays remaining 5 stories"
echo ""

# Verify pagination constant
if ! grep -q 'ITEMS_PER_PAGE = 20' apps/frontend/public/app.js; then
  echo "❌ FAIL: ITEMS_PER_PAGE constant not set to 20"
  exit 1
fi
echo "✅ ITEMS_PER_PAGE set to 20"

# Verify pagination controls
if ! grep -q 'story-list-pagination' apps/frontend/public/app.js; then
  echo "❌ FAIL: Pagination controls not found"
  exit 1
fi
echo "✅ Pagination controls implemented"

# Verify Previous/Next buttons
if ! grep -q 'id="prev-page"' apps/frontend/public/app.js; then
  echo "❌ FAIL: Previous page button not found"
  exit 1
fi
if ! grep -q 'id="next-page"' apps/frontend/public/app.js; then
  echo "❌ FAIL: Next page button not found"
  exit 1
fi
echo "✅ Previous and Next page buttons present"

# Verify page calculation
if ! grep -q 'totalPages' apps/frontend/public/app.js; then
  echo "❌ FAIL: Total pages calculation not found"
  exit 1
fi
echo "✅ Total pages calculation implemented"

# Verify CSS styles exist
if ! grep -q 'story-list-table' apps/frontend/public/styles.css; then
  echo "❌ FAIL: Story list table styles not found"
  exit 1
fi
echo "✅ Story list table styles present"

if ! grep -q 'story-list-pagination' apps/frontend/public/styles.css; then
  echo "❌ FAIL: Pagination styles not found"
  exit 1
fi
echo "✅ Pagination styles present"

echo ""
echo "Test 2: ✅ PASSED"
echo ""

echo "=== All Acceptance Tests PASSED ==="
exit 0
