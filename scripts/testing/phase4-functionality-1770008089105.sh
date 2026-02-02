#!/bin/bash
# Phase 4 Functionality Test for Story 1770008089105: Add Story List Button

STORY_ID="1770008089105"
echo "Testing Story $STORY_ID: Add Story List Button"

# Test 1: Verify button exists in HTML
echo "Test 1: Checking if story list button exists in HTML..."
if grep -q 'id="story-list-btn"' apps/frontend/public/index.html; then
  echo "✅ Story list button found in HTML"
else
  echo "❌ Story list button NOT found in HTML"
  exit 1
fi

# Test 2: Verify button reference in JavaScript
echo "Test 2: Checking if button reference exists in JavaScript..."
if grep -q 'const storyListBtn' apps/frontend/public/app.js; then
  echo "✅ Button reference found in JavaScript"
else
  echo "❌ Button reference NOT found in JavaScript"
  exit 1
fi

# Test 3: Verify event listener
echo "Test 3: Checking if event listener is attached..."
if grep -q 'storyListBtn.addEventListener' apps/frontend/public/app.js; then
  echo "✅ Event listener found"
else
  echo "❌ Event listener NOT found"
  exit 1
fi

# Test 4: Verify modal function exists
echo "Test 4: Checking if openStoryListModal function exists..."
if grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  echo "✅ Modal function found"
else
  echo "❌ Modal function NOT found"
  exit 1
fi

echo ""
echo "✅ All tests passed for Story $STORY_ID"
