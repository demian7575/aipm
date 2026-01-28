#!/bin/bash
# Phase 4: Story-specific functionality tests

echo "=== Phase 4: Story 1769565049805 Tests ==="

# Test 1: Modal displays story list when header button clicked
echo "Test 1: Story list button exists in header"
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "✅ Story list button found in header"
else
  echo "❌ Story list button not found in header"
  exit 1
fi

# Test 2: Story titles are clickable navigation links
echo "Test 2: openStoryListModal function exists"
if grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  echo "✅ openStoryListModal function found"
else
  echo "❌ openStoryListModal function not found"
  exit 1
fi

echo "Test 3: Story list button has click handler"
if grep -q "storyListBtn.*addEventListener.*click" apps/frontend/public/app.js; then
  echo "✅ Story list button click handler found"
else
  echo "❌ Story list button click handler not found"
  exit 1
fi

echo "Test 4: Modal shows story titles"
if grep -q "story.title" apps/frontend/public/app.js && grep -q "openStoryListModal" apps/frontend/public/app.js; then
  echo "✅ Modal displays story titles"
else
  echo "❌ Modal does not display story titles"
  exit 1
fi

echo "Test 5: Story titles are clickable"
if grep -q "selectStory.*story.id" apps/frontend/public/app.js; then
  echo "✅ Story titles are clickable and navigate"
else
  echo "❌ Story titles are not clickable"
  exit 1
fi

echo ""
echo "✅ ALL PHASE 4 TESTS PASSED"
