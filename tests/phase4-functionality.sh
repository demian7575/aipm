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

echo "Running acceptance tests for Story 1769571379534..."
echo ""

echo "Test: Modal displays story titles when header button is clicked"
echo "  Given: User is on any page in the application, 15 stories exist in the system"
echo "  When: User clicks the story list button in the header"
echo "  Then: Modal opens displaying all 15 story titles, Titles are shown in a vertical list, Close button appears in top-right corner"
grep -q 'id="story-list-btn"' apps/frontend/public/index.html && echo "  ✓ Story list button exists in header" || echo "  ✗ Story list button not found"
grep -q 'function openStoryListModal' apps/frontend/public/app.js && echo "  ✓ openStoryListModal function exists" || echo "  ✗ openStoryListModal function not found"
grep -q 'story-title-list' apps/frontend/public/app.js && echo "  ✓ Story title list rendering implemented" || echo "  ✗ Story title list not found"
grep -q 'pagination-controls' apps/frontend/public/app.js && echo "  ✓ Pagination controls implemented" || echo "  ✗ Pagination controls not found"
grep -q '\.story-title-list' apps/frontend/public/styles.css && echo "  ✓ Story list styles exist" || echo "  ✗ Story list styles not found"
echo ""

echo "All acceptance tests completed"
