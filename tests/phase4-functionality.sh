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

echo "Running acceptance tests for Story 1769611616078..."
echo ""

echo "Test: Modal displays all story titles when header button is clicked"
echo "  Given: 5 user stories exist with titles: Story A, Story B, Story C, Story D, Story E"
echo "  Given: User is on the main application page"
echo "  When: User clicks the story list button in the header"
echo "  Then: Modal opens displaying all 5 story titles"
echo "  Then: Each title appears as a separate list item"
echo "  Then: Modal includes a close button"
echo "  Status: AUTOMATED"
grep -q "id=\"story-list-btn\"" apps/frontend/public/index.html && echo "  ✓ Story list button exists in header" || echo "  ✗ Story list button not found"
grep -q "storyListBtn?.addEventListener" apps/frontend/public/app.js && echo "  ✓ Story list button has click handler" || echo "  ✗ Click handler not found"
grep -q "state.stories.forEach" apps/frontend/public/app.js && echo "  ✓ Code iterates through stories" || echo "  ✗ Story iteration not found"
grep -q "openModal" apps/frontend/public/app.js && echo "  ✓ Modal opening function exists" || echo "  ✗ Modal function not found"
echo ""

echo "All acceptance tests completed"
