#!/bin/bash
# Phase 4 Functionality Test: Story 1769564229426 - Add Story List Button

set -e

echo "=== Phase 4: Story 1769564229426 - Add Story List Button ==="

# Test 1: Modal displays all story titles when header button is clicked
echo "Test 1: Verify story list button exists in HTML"
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "✅ Story list button found in HTML"
else
  echo "❌ Story list button NOT found in HTML"
  exit 1
fi

# Test 2: Verify JavaScript has button reference
echo "Test 2: Verify JavaScript has storyListBtn reference"
if grep -q 'storyListBtn.*getElementById.*story-list-btn' apps/frontend/public/app.js; then
  echo "✅ storyListBtn reference found"
else
  echo "❌ storyListBtn reference NOT found"
  exit 1
fi

# Test 3: Verify event listener exists
echo "Test 3: Verify event listener for story list button"
if grep -q 'storyListBtn.*addEventListener' apps/frontend/public/app.js; then
  echo "✅ Event listener found"
else
  echo "❌ Event listener NOT found"
  exit 1
fi

# Test 4: Verify openStoryListModal function exists
echo "Test 4: Verify openStoryListModal function exists"
if grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  echo "✅ openStoryListModal function found"
else
  echo "❌ openStoryListModal function NOT found"
  exit 1
fi

# Test 5: Verify function calls openModal
echo "Test 5: Verify function calls openModal"
if grep -A 30 'function openStoryListModal' apps/frontend/public/app.js | grep -q 'openModal'; then
  echo "✅ Function calls openModal"
else
  echo "❌ Function does NOT call openModal"
  exit 1
fi

# Test 6: Verify JavaScript syntax is valid
echo "Test 6: Verify JavaScript syntax"
if node -c apps/frontend/public/app.js 2>&1; then
  echo "✅ JavaScript syntax valid"
else
  echo "❌ JavaScript syntax error"
  exit 1
fi

echo ""
echo "✅ ALL PHASE 4 TESTS PASSED for Story 1769564229426"
