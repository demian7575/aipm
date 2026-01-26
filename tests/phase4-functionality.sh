#!/usr/bin/env bash
# Phase 4: Story-specific functionality tests
# Tests acceptance criteria for individual user stories

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "Phase 4: Story Functionality Tests"
echo "========================================="

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
pass_test() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((TESTS_PASSED++))
  ((TESTS_RUN++))
}

fail_test() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  echo "  Reason: $2"
  ((TESTS_FAILED++))
  ((TESTS_RUN++))
}

# Story 1769446166175: Display User Stories in Sortable List View with Status
echo ""
echo "Testing Story 1769446166175: Story List View"
echo "-------------------------------------------"

# Test 1: Display story list with all required columns
echo "Test 1: Display story list with all required columns"
if [ -f "$PROJECT_ROOT/apps/frontend/public/story-list.html" ]; then
  # Check for table structure
  if grep -q "story-table" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "<th>Title</th>" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "<th>Description</th>" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "<th>Status</th>" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
    pass_test "Story list page has table with title, description, and status columns"
  else
    fail_test "Story list page missing required columns" "Expected Title, Description, Status columns"
  fi
else
  fail_test "Story list page not found" "Expected story-list.html to exist"
fi

# Test 2: Pagination displays 20 stories per page
echo "Test 2: Pagination displays 20 stories per page"
if [ -f "$PROJECT_ROOT/apps/frontend/public/story-list.html" ]; then
  if grep -q "pageSize = 20" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "pagination" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
    pass_test "Pagination configured for 20 items per page"
  else
    fail_test "Pagination not properly configured" "Expected pageSize = 20 and pagination controls"
  fi
else
  fail_test "Story list page not found" "Expected story-list.html to exist"
fi

# Summary
echo ""
echo "========================================="
echo "Phase 4 Test Summary"
echo "========================================="
echo "Tests run: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $TESTS_FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}All Phase 4 tests passed!${NC}"
  exit 0
fi
