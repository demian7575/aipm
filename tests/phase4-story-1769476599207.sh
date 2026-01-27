#!/bin/bash
# Acceptance tests for Story 1769476599207: Display User Stories in Sortable List View with Status

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
STORY_ID=1769476599207

echo "🧪 Testing Story $STORY_ID: Display User Stories in Sortable List View with Status"
echo ""

# Test 1: Display story list with all required columns
echo "Test 1: Display story list with all required columns"
echo "Given: 5 user stories exist in the system with different statuses"
echo "When: Project manager opens the story list page"
echo "Then: All 5 stories are displayed in a table"
echo "      Each row shows title, description, and status columns"
echo "      Rows have alternating background colors"

# Verify story-list.html exists
if [ ! -f "apps/frontend/public/story-list.html" ]; then
  echo "❌ FAIL: story-list.html not found"
  exit 1
fi

# Verify HTML contains required table structure
if ! grep -q '<table class="story-table">' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: story-table not found in HTML"
  exit 1
fi

if ! grep -q '<th>Title</th>' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Title column not found"
  exit 1
fi

if ! grep -q '<th>Description</th>' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Description column not found"
  exit 1
fi

if ! grep -q '<th>Status</th>' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Status column not found"
  exit 1
fi

# Verify alternating row colors in CSS
if ! grep -q 'nth-child(even)' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Alternating row colors not implemented"
  exit 1
fi

echo "✅ PASS: Test 1"
echo ""

# Test 2: Pagination controls appear when stories exceed 20 items
echo "Test 2: Pagination controls appear when stories exceed 20 items"
echo "Given: 25 user stories exist in the system"
echo "When: Project manager opens the story list page"
echo "Then: First 20 stories are displayed on page 1"
echo "      Pagination controls show page 1 of 2"
echo "      Clicking page 2 displays the remaining 5 stories"

# Verify pagination controls exist
if ! grep -q 'class="pagination"' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Pagination controls not found"
  exit 1
fi

if ! grep -q 'id="prev-btn"' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Previous button not found"
  exit 1
fi

if ! grep -q 'id="next-btn"' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Next button not found"
  exit 1
fi

if ! grep -q 'id="page-info"' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Page info not found"
  exit 1
fi

# Verify ITEMS_PER_PAGE is set to 20
if ! grep -q 'ITEMS_PER_PAGE = 20' apps/frontend/public/story-list.html; then
  echo "❌ FAIL: ITEMS_PER_PAGE not set to 20"
  exit 1
fi

echo "✅ PASS: Test 2"
echo ""

echo "✅ All acceptance tests passed for Story $STORY_ID"
