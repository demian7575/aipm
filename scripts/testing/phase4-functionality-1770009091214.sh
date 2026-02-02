#!/bin/bash
# Phase 4 Functionality Test for Story 1770009091214: Add view tab selector for Mindmap and Kanban

STORY_ID="1770009091214"
echo "Testing Story $STORY_ID: Add view tab selector for Mindmap and Kanban"

# Test 1: Verify view tabs exist in HTML
echo "Test 1: Checking if view tabs exist in HTML..."
if grep -q 'id="view-tab-mindmap"' apps/frontend/public/index.html && grep -q 'id="view-tab-kanban"' apps/frontend/public/index.html; then
  echo "✅ View tabs found in HTML"
else
  echo "❌ View tabs NOT found in HTML"
  exit 1
fi

# Test 2: Verify Kanban panel exists
echo "Test 2: Checking if Kanban panel exists..."
if grep -q 'id="kanban-panel"' apps/frontend/public/index.html; then
  echo "✅ Kanban panel found in HTML"
else
  echo "❌ Kanban panel NOT found in HTML"
  exit 1
fi

# Test 3: Verify tab references in JavaScript
echo "Test 3: Checking if tab references exist in JavaScript..."
if grep -q 'viewTabMindmap' apps/frontend/public/app.js && grep -q 'viewTabKanban' apps/frontend/public/app.js; then
  echo "✅ Tab references found in JavaScript"
else
  echo "❌ Tab references NOT found in JavaScript"
  exit 1
fi

# Test 4: Verify switchView function exists
echo "Test 4: Checking if switchView function exists..."
if grep -q 'function switchView' apps/frontend/public/app.js; then
  echo "✅ switchView function found"
else
  echo "❌ switchView function NOT found"
  exit 1
fi

# Test 5: Verify view tab styling exists
echo "Test 5: Checking if view tab styling exists..."
if grep -q '.view-tab' apps/frontend/public/styles.css; then
  echo "✅ View tab styling found"
else
  echo "❌ View tab styling NOT found"
  exit 1
fi

echo ""
echo "✅ All tests passed for Story $STORY_ID"
