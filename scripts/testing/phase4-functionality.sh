#!/usr/bin/env bash
# Phase 4 Functionality Test: Story List Button Feature
# Tests acceptance criteria for story #1769753844462

set -e

echo "=========================================="
echo "Phase 4: Story List Button Feature Tests"
echo "=========================================="
echo ""

API_BASE="http://localhost:4000"
STORY_ID=1769753844462

# Test 1: Verify button exists in HTML
echo "Test 1: Verify Story List button exists in header"
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "✅ Story List button found in HTML"
else
  echo "❌ Story List button NOT found in HTML"
  exit 1
fi

# Test 2: Verify button has correct class
echo ""
echo "Test 2: Verify button has secondary class"
if grep -q 'id="story-list-btn" class="secondary"' apps/frontend/public/index.html; then
  echo "✅ Button has correct class"
else
  echo "❌ Button class incorrect"
  exit 1
fi

# Test 3: Verify JavaScript references button
echo ""
echo "Test 3: Verify JavaScript references story-list-btn"
if grep -q "getElementById('story-list-btn')" apps/frontend/public/app.js; then
  echo "✅ JavaScript references button"
else
  echo "❌ JavaScript does NOT reference button"
  exit 1
fi

# Test 4: Verify event listener exists
echo ""
echo "Test 4: Verify event listener for story list button"
if grep -q "storyListBtn.*addEventListener" apps/frontend/public/app.js; then
  echo "✅ Event listener found"
else
  echo "❌ Event listener NOT found"
  exit 1
fi

# Test 5: Verify openStoryListModal function exists
echo ""
echo "Test 5: Verify openStoryListModal function exists"
if grep -q "function openStoryListModal" apps/frontend/public/app.js; then
  echo "✅ openStoryListModal function found"
else
  echo "❌ openStoryListModal function NOT found"
  exit 1
fi

# Test 6: Verify modal has correct ID
echo ""
echo "Test 6: Verify modal container has story-list-modal ID"
if grep -q 'id.*story-list-modal' apps/frontend/public/app.js; then
  echo "✅ Modal ID found"
else
  echo "❌ Modal ID NOT found"
  exit 1
fi

# Test 7: Verify modal is scrollable (maxHeight + overflow)
echo ""
echo "Test 7: Verify modal has scrollable properties"
if grep -q "maxHeight.*overflow" apps/frontend/public/app.js; then
  echo "✅ Scrollable properties found"
else
  echo "❌ Scrollable properties NOT found"
  exit 1
fi

# Test 8: Verify 50 item limit
echo ""
echo "Test 8: Verify 50 item display limit"
if grep -q "slice(0, 50)" apps/frontend/public/app.js; then
  echo "✅ 50 item limit implemented"
else
  echo "❌ 50 item limit NOT found"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ ALL PHASE 4 TESTS PASSED"
echo "=========================================="
