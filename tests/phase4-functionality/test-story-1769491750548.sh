#!/bin/bash
# Test: Story 1769491750548 - Display Story List with Title, Description, and Status
# Acceptance Test 1: List displays all story information in table format
# Acceptance Test 2: Table layout provides clear visual organization

set -e

echo "Testing Story 1769491750548: Display Story List with Title, Description, and Status"

# Test 1: Verify story list button exists
echo "✓ Test 1: Verify story list button exists in HTML"
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "  ✓ Story list button found"
else
  echo "  ✗ Story list button not found"
  exit 1
fi

# Test 2: Verify openStoryListModal function exists
echo "✓ Test 2: Verify openStoryListModal function exists"
if grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  echo "  ✓ openStoryListModal function found"
else
  echo "  ✗ openStoryListModal function not found"
  exit 1
fi

# Test 3: Verify table structure with 3 columns
echo "✓ Test 3: Verify table with Title, Description, Status columns"
if grep -q '<th>Title</th>' apps/frontend/public/app.js && \
   grep -q '<th>Description</th>' apps/frontend/public/app.js && \
   grep -q '<th>Status</th>' apps/frontend/public/app.js; then
  echo "  ✓ Table headers for Title, Description, Status found"
else
  echo "  ✗ Table headers not found"
  exit 1
fi

# Test 4: Verify pagination (25 stories per page)
echo "✓ Test 4: Verify pagination with 25 stories per page"
if grep -q 'const storiesPerPage = 25' apps/frontend/public/app.js; then
  echo "  ✓ Pagination set to 25 stories per page"
else
  echo "  ✗ Pagination not configured correctly"
  exit 1
fi

# Test 5: Verify table CSS class
echo "✓ Test 5: Verify table styling"
if grep -q 'story-list-table' apps/frontend/public/app.js && \
   grep -q '.story-list-table' apps/frontend/public/styles.css; then
  echo "  ✓ Table styling class found"
else
  echo "  ✗ Table styling not found"
  exit 1
fi

# Test 6: Verify alternating row colors
echo "✓ Test 6: Verify alternating row colors"
if grep -q 'tbody tr:nth-child(odd)' apps/frontend/public/styles.css && \
   grep -q 'tbody tr:nth-child(even)' apps/frontend/public/styles.css; then
  echo "  ✓ Alternating row color styles found"
else
  echo "  ✗ Alternating row colors not implemented"
  exit 1
fi

# Test 7: Verify column headers styling
echo "✓ Test 7: Verify column headers"
if grep -q '.story-list-table thead' apps/frontend/public/styles.css; then
  echo "  ✓ Table header styles defined"
else
  echo "  ✗ Table header styles not found"
  exit 1
fi

# Test 8: Verify event listener
echo "✓ Test 8: Verify event listener attached"
if grep -q "storyListBtn.addEventListener('click'" apps/frontend/public/app.js; then
  echo "  ✓ Event listener attached"
else
  echo "  ✗ Event listener not found"
  exit 1
fi

echo ""
echo "✅ All tests passed for Story 1769491750548"
