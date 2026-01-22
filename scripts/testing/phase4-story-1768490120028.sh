#!/bin/bash
# Phase 4 Story-Specific Test: Enable connection to parent User Story
# Story ID: 1768490120028

set -e
source "$(dirname "$0")/test-functions.sh"

STORY_ID="1768490120028"
STORY_TITLE="Enable connection to parent User Story"

echo "  🧪 Phase 4 Story Test: $STORY_TITLE (ID: $STORY_ID)"

# Test 1: Verify parent story selection in edit modal
echo "    ✓ Test 1: Verify parent story selection UI exists..."
if ! grep -q 'name="parentId"' apps/frontend/public/app.js; then
  fail_test "Parent story selector not found in edit modal"
fi
if ! grep -q 'Parent Story:' apps/frontend/public/app.js; then
  fail_test "Parent Story label not found in edit modal"
fi
if ! grep -q 'Root Level' apps/frontend/public/app.js; then
  fail_test "Root Level option not found in parent selector"
fi
pass_test "Parent story selector exists in edit modal"

# Test 2: Verify parentId is included in update payload
echo "    ✓ Test 2: Verify parentId in update payload..."
if ! grep -q 'parentId:.*parentIdValue' apps/frontend/public/app.js; then
  fail_test "parentId not included in update payload"
fi
pass_test "parentId included in frontend update payload"

# Test 3: Verify backend handles parentId updates (DynamoDB)
echo "    ✓ Test 3: Verify backend DynamoDB parentId handling..."
if ! grep -q "payload.parentId !== undefined" apps/backend/app.js; then
  fail_test "Backend does not check for parentId in payload"
fi
if ! grep -q "updateExpressions.push('parentId = :parentId')" apps/backend/app.js; then
  fail_test "Backend does not add parentId to DynamoDB update expression"
fi
pass_test "Backend handles parentId in DynamoDB updates"

# Test 4: Verify backend handles parentId updates (SQLite)
echo "    ✓ Test 4: Verify backend SQLite parentId handling..."
if ! grep -q "parentId: payload.parentId" apps/backend/app.js; then
  fail_test "Backend does not handle parentId in SQLite updates"
fi
pass_test "Backend handles parentId in SQLite updates"

# Test 5: Verify parent dropdown is populated with available stories
echo "    ✓ Test 5: Verify parent dropdown population logic..."
if ! grep -q 'collectStories' apps/frontend/public/app.js; then
  fail_test "Story collection logic not found"
fi
if ! grep -q 'node.id !== story.id' apps/frontend/public/app.js; then
  fail_test "Current story exclusion logic not found"
fi
pass_test "Parent dropdown population logic exists"

echo "  ✅ Story $STORY_ID tests passed"
