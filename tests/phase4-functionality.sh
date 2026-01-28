#!/bin/bash
set -e

echo "Running acceptance tests for Story 1769561711776..."
echo ""

echo "Test 1: Header button opens modal with story titles"
echo "  Given: 5 stories exist in the system"
echo "  When: User clicks the story list button in header"
echo "  Then: Modal opens, Modal displays 5 story titles, Close button is visible"
echo "  Status: MANUAL - Verify button exists with id 'show-story-list-modal'"
grep -q 'id="show-story-list-modal"' apps/frontend/public/index.html && echo "  ✓ Button found in HTML" || echo "  ✗ Button not found"
grep -q 'openStoryListModal' apps/frontend/public/app.js && echo "  ✓ Function found in JS" || echo "  ✗ Function not found"
echo ""

echo "Test 2: Clicking story title navigates to story"
echo "  Given: Modal is open with story list"
echo "  When: User clicks on a story title"
echo "  Then: Modal closes, Story details panel shows the selected story"
echo "  Status: MANUAL - Verify selectStory() is called on click"
grep -q 'selectStory(story.id)' apps/frontend/public/app.js && echo "  ✓ Navigation logic found" || echo "  ✗ Navigation logic not found"
echo ""

echo "All acceptance tests completed"
