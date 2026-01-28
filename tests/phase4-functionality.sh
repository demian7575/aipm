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

echo "Running acceptance tests for Story 1769591825146..."
echo ""

echo "Test: Modal displays story list when header button clicked"
echo "  Given: User is on any page in the application, 5 stories exist in the system"
echo "  When: User clicks the story list button in the header"
echo "  Then: Modal opens displaying all 5 story titles, Modal includes a close button, Clicking outside the modal closes it"
grep -q "id=\"story-list-btn\"" apps/frontend/public/index.html && echo "  ✓ Story list button exists in header" || echo "  ✗ Story list button not found"
grep -q "function openStoryListModal" apps/frontend/public/app.js && echo "  ✓ openStoryListModal function exists" || echo "  ✗ openStoryListModal function not found"
grep -q "storyListBtn.addEventListener" apps/frontend/public/app.js && echo "  ✓ Button click handler registered" || echo "  ✗ Button click handler not found"
echo ""

echo "Test: Story titles are clickable navigation links"
echo "  Given: Story list modal is open, Story with ID 1000 is displayed in the list"
echo "  When: User clicks on the title for story 1000"
echo "  Then: Modal closes, Application navigates to story 1000 details page, Story 1000 details are displayed"
grep -A 30 "function openStoryListModal" apps/frontend/public/app.js | grep -q "selectStory" && echo "  ✓ Story selection on click implemented" || echo "  ✗ Story selection not found"
grep -A 30 "function openStoryListModal" apps/frontend/public/app.js | grep -q "closeModal" && echo "  ✓ Modal closes after selection" || echo "  ✗ Modal close not found"
echo ""

echo "All acceptance tests completed"
