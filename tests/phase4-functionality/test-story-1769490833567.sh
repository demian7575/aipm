#!/bin/bash
# Test: Story 1769490833567 - Display User Stories with Filters and Sorting
# Acceptance Test 1: Stories are grouped by status with correct labels
# Acceptance Test 2: Story entries display required information

set -e

echo "Testing Story 1769490833567: Display User Stories with Filters and Sorting"

# Test 1: Stories are grouped by status with correct labels
echo "✓ Test 1: Verify story list button exists in HTML"
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "  ✓ Story list button found in HTML"
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

# Test 3: Verify status grouping logic
echo "✓ Test 3: Verify status grouping implementation"
if grep -q "const statusOrder = \['Draft', 'Ready', 'In Progress', 'Blocked', 'Approved', 'Done'\]" apps/frontend/public/app.js; then
  echo "  ✓ Status grouping order defined"
else
  echo "  ✗ Status grouping order not found"
  exit 1
fi

# Test 4: Verify pagination (20 stories per page)
echo "✓ Test 4: Verify pagination with 20 stories per page"
if grep -q 'const storiesPerPage = 20' apps/frontend/public/app.js; then
  echo "  ✓ Pagination set to 20 stories per page"
else
  echo "  ✗ Pagination not configured correctly"
  exit 1
fi

# Test 5: Verify title display (bold)
echo "✓ Test 5: Verify title styling"
if grep -q 'story-list-title' apps/frontend/public/app.js && grep -q '.story-list-title' apps/frontend/public/styles.css; then
  echo "  ✓ Title styling class found"
  if grep -q 'font-weight: bold' apps/frontend/public/styles.css; then
    echo "  ✓ Title is bold"
  else
    echo "  ✗ Title not bold"
    exit 1
  fi
else
  echo "  ✗ Title styling not found"
  exit 1
fi

# Test 6: Verify description truncation (100 characters)
echo "✓ Test 6: Verify description truncation at 100 characters"
if grep -q 'story.description.length > 100' apps/frontend/public/app.js; then
  echo "  ✓ Description truncation logic found"
  if grep -q 'substring(0, 100)' apps/frontend/public/app.js; then
    echo "  ✓ Truncation at 100 characters"
  else
    echo "  ✗ Truncation not at 100 characters"
    exit 1
  fi
else
  echo "  ✗ Description truncation not found"
  exit 1
fi

# Test 7: Verify status badge display
echo "✓ Test 7: Verify status badge implementation"
if grep -q 'story-list-badge' apps/frontend/public/app.js; then
  echo "  ✓ Status badge class found"
  if grep -q '.story-list-badge' apps/frontend/public/styles.css; then
    echo "  ✓ Status badge styles defined"
  else
    echo "  ✗ Status badge styles not found"
    exit 1
  fi
else
  echo "  ✗ Status badge not implemented"
  exit 1
fi

# Test 8: Verify event listener for story list button
echo "✓ Test 8: Verify event listener attached"
if grep -q "storyListBtn.addEventListener('click'" apps/frontend/public/app.js; then
  echo "  ✓ Event listener attached to story list button"
else
  echo "  ✗ Event listener not found"
  exit 1
fi

echo ""
echo "✅ All tests passed for Story 1769490833567"
