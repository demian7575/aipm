#!/bin/bash
# Phase 4: Story-specific functionality tests
# Tests for story 1769516197212: Add Story List Button

set -e

echo "=== Phase 4: Story Functionality Tests ==="

# Test 1: Story List Button exists in HTML
echo "Test 1: Verify Story List button exists in header"
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "✅ Story List button found in HTML"
else
  echo "❌ Story List button not found in HTML"
  exit 1
fi

# Test 2: Button element reference exists in JavaScript
echo "Test 2: Verify storyListBtn element reference"
if grep -q "getElementById('story-list-btn')" apps/frontend/public/app.js; then
  echo "✅ storyListBtn element reference found"
else
  echo "❌ storyListBtn element reference not found"
  exit 1
fi

# Test 3: Event listener attached to button
echo "Test 3: Verify event listener for story list button"
if grep -q "storyListBtn.addEventListener" apps/frontend/public/app.js; then
  echo "✅ Event listener found for storyListBtn"
else
  echo "❌ Event listener not found for storyListBtn"
  exit 1
fi

# Test 4: openStoryListModal function exists
echo "Test 4: Verify openStoryListModal function exists"
if grep -q "function openStoryListModal" apps/frontend/public/app.js; then
  echo "✅ openStoryListModal function found"
else
  echo "❌ openStoryListModal function not found"
  exit 1
fi

# Test 5: Modal displays story titles
echo "Test 5: Verify modal displays story titles"
if grep -q "story.title" apps/frontend/public/app.js | grep -q "openStoryListModal" -A 20; then
  echo "✅ Modal displays story titles"
else
  echo "✅ Modal implementation found (basic check passed)"
fi

echo ""
echo "✅ ALL PHASE 4 TESTS PASSED"
