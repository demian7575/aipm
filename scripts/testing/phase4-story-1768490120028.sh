#!/bin/bash
# Phase 4 Story-Specific Test: Enable connection to parent User Story
# Story ID: 1768490120028

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1768490120028"
STORY_TITLE="Enable connection to parent User Story"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Verify parent story selection in edit modal
echo "    ✓ Checking parent story selector exists in edit modal..."
if ! grep -q 'name="parentId"' apps/frontend/public/app.js; then
  fail_test "Parent story selector not found in edit modal"
fi
if ! grep -q 'Parent Story:' apps/frontend/public/app.js; then
  fail_test "Parent Story label not found in edit modal"
fi
if ! grep -q 'Root Level' apps/frontend/public/app.js; then
  fail_test "Root Level option not found in parent selector"
fi

# Test 2: Verify backend handles parentId in PATCH
echo "    ✓ Verifying backend accepts parentId updates..."
if ! grep -q 'const parentId = payload.parentId' apps/backend/app.js; then
  fail_test "Backend does not extract parentId from payload"
fi
if ! grep -q 'parentIdChanged' apps/backend/app.js; then
  fail_test "Backend does not track parentId changes"
fi
if ! grep -q 'parent_id = :parentId' apps/backend/app.js; then
  fail_test "Backend does not update parent_id in DynamoDB"
fi

# Test 3: Verify parent dropdown is populated
echo "    ✓ Checking parent dropdown population logic..."
if ! grep -q 'const parentSelect = modal.querySelector' apps/frontend/public/app.js; then
  fail_test "Parent select element not queried"
fi
if ! grep -q 'allStories.forEach' apps/frontend/public/app.js; then
  fail_test "Stories not iterated to populate parent dropdown"
fi

# Test 4: Verify parentId is included in update payload
echo "    ✓ Verifying parentId is sent in update request..."
if ! grep -q 'parentId: parentIdValue' apps/frontend/public/app.js; then
  fail_test "parentId not included in update payload"
fi

pass_test "Story $STORY_ID acceptance tests"

echo "  ✅ Story $STORY_ID tests passed"
