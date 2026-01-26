#!/bin/bash
# Phase 4 Story-Specific Test: Display User Stories in Status-Grouped List View
# Story ID: 1769445830451

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1769445830451"
STORY_TITLE="Display User Stories in Status-Grouped List View"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Stories are grouped by status with correct labels
echo "    ✓ Checking status grouping implementation..."
if ! grep -q 'statusGroups' apps/frontend/public/app.js; then
  fail_test "Status grouping logic not found"
fi
if ! grep -q "'Draft':" apps/frontend/public/app.js; then
  fail_test "Draft status group not defined"
fi
if ! grep -q "'Ready':" apps/frontend/public/app.js; then
  fail_test "Ready status group not defined"
fi
if ! grep -q "'In Progress':" apps/frontend/public/app.js; then
  fail_test "In Progress status group not defined"
fi
if ! grep -q "'Done':" apps/frontend/public/app.js; then
  fail_test "Done status group not defined"
fi

# Test 2: Story cards display title, description, and status badge
echo "    ✓ Verifying story card display elements..."
if ! grep -q 'story-title' apps/frontend/public/app.js; then
  fail_test "Story title element not found"
fi
if ! grep -q 'story-description' apps/frontend/public/app.js; then
  fail_test "Story description element not found"
fi
if ! grep -q 'story-status-badge' apps/frontend/public/app.js; then
  fail_test "Story status badge element not found"
fi
if ! grep -q 'substring(0, 100)' apps/frontend/public/app.js; then
  fail_test "Description truncation to 100 characters not implemented"
fi

# Test 3: Story List button exists in UI
echo "    ✓ Checking Story List button in header..."
if ! grep -q 'story-list-btn' apps/frontend/public/index.html; then
  fail_test "Story List button not found in HTML"
fi
if ! grep -q 'storyListBtn' apps/frontend/public/app.js; then
  fail_test "Story List button reference not found in JS"
fi

# Test 4: Modal opens with story list
echo "    ✓ Verifying openStoryListModal function..."
if ! grep -q 'function openStoryListModal' apps/frontend/public/app.js; then
  fail_test "openStoryListModal function not defined"
fi
if ! grep -q 'User Stories by Status' apps/frontend/public/app.js; then
  fail_test "Story list modal title not found"
fi

# Test 5: CSS styles for story list exist
echo "    ✓ Checking CSS styles for story list..."
if ! grep -q '.story-list-container' apps/frontend/public/styles.css; then
  fail_test "Story list container styles not found"
fi
if ! grep -q '.story-card' apps/frontend/public/styles.css; then
  fail_test "Story card styles not found"
fi
if ! grep -q '.status-group' apps/frontend/public/styles.css; then
  fail_test "Status group styles not found"
fi

pass_test "Story $STORY_ID acceptance tests"

echo "  ✅ Story $STORY_ID tests passed"
