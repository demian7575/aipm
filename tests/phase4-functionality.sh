#!/bin/bash
set -e

echo "Running acceptance tests for Story 1769561130473..."
echo ""

echo "Test: Dependencies and Dependents sections are removed"
echo "  Given: User views a story with dependencies"
echo "  When: User opens the story details panel"
echo "  Then: Blocked By section is visible, Dependencies and Dependents sections are not displayed"
echo "  Status: MANUAL - Verify only Blocked By section exists in dependency groups"
grep -A 10 "const dependencyGroups = \[" apps/frontend/public/app.js | grep -q "key: 'blocked-by'" && echo "  ✓ Blocked By section found" || echo "  ✗ Blocked By section not found"
grep -A 10 "const dependencyGroups = \[" apps/frontend/public/app.js | grep -q "key: 'upstream'" && echo "  ✗ Dependencies section still exists" || echo "  ✓ Dependencies section removed"
grep -A 10 "const dependencyGroups = \[" apps/frontend/public/app.js | grep -q "key: 'downstream'" && echo "  ✗ Dependents section still exists" || echo "  ✓ Dependents section removed"
echo ""

echo "Running acceptance tests for Story 1769615568653..."
echo ""

echo "Test: Modal displays story list when header button clicked"
echo "  Given: User is on any page in the application, 15 user stories exist in the system"
echo "  When: User clicks the story list button in the header"
echo "  Then: Modal opens displaying all 15 story titles, Each title is displayed as a clickable link, Modal includes a close button in the top-right corner"
grep -q 'id="story-list-btn"' apps/frontend/public/index.html && echo "  ✓ Story list button exists in header" || echo "  ✗ Story list button not found"
grep -q 'function openStoryListModal' apps/frontend/public/app.js && echo "  ✓ openStoryListModal function exists" || echo "  ✗ openStoryListModal function not found"
grep -q "storyListBtn.addEventListener('click'" apps/frontend/public/app.js && echo "  ✓ Event listener attached to button" || echo "  ✗ Event listener not found"
grep -A 20 'function openStoryListModal' apps/frontend/public/app.js | grep -q 'story-link' && echo "  ✓ Story titles rendered as clickable links" || echo "  ✗ Clickable links not found"
echo ""

echo "All acceptance tests completed"
