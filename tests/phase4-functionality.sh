#!/bin/bash
# Phase 4 Functionality Tests - Story-specific acceptance tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Phase 4: Story Functionality Tests ==="
echo "Testing story-specific acceptance criteria..."

# Story 1769479448817: Display User Stories with Filters and Sorting
echo ""
echo "Testing Story 1769479448817: Display User Stories with Filters and Sorting"

# Test 1: Story list page exists
if [ ! -f "$PROJECT_ROOT/apps/frontend/public/story-list.html" ]; then
  echo "❌ FAIL: story-list.html not found"
  exit 1
fi
echo "✅ PASS: story-list.html exists"

# Test 2: Story list page contains required elements
if ! grep -q "story-table" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
  echo "❌ FAIL: story-table element not found"
  exit 1
fi
echo "✅ PASS: story-table element found"

# Test 3: Pagination controls exist
if ! grep -q "pagination" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
  echo "❌ FAIL: pagination controls not found"
  exit 1
fi
echo "✅ PASS: pagination controls found"

# Test 4: Status filter exists
if ! grep -q "status-filter" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
  echo "❌ FAIL: status filter not found"
  exit 1
fi
echo "✅ PASS: status filter found"

# Test 5: Sortable columns exist
if ! grep -q "sortable" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
  echo "❌ FAIL: sortable columns not found"
  exit 1
fi
echo "✅ PASS: sortable columns found"

# Test 6: STORIES_PER_PAGE is set to 20
if ! grep -q "STORIES_PER_PAGE = 20" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
  echo "❌ FAIL: STORIES_PER_PAGE not set to 20"
  exit 1
fi
echo "✅ PASS: STORIES_PER_PAGE set to 20"

echo ""
echo "✅ ALL PHASE 4 TESTS PASSED"
