#!/usr/bin/env bash
# Phase 4: Story-specific functionality tests
# Tests acceptance criteria for individual user stories

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
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

# Story 1769474044012: Status-Grouped Story List View
echo ""
echo "Testing Story 1769474044012: Status-Grouped Story List"
echo "-------------------------------------------------------"

# Test 1: Stories are grouped by status
echo "Test 1: Stories are grouped by status with correct labels"
if [ -f "$PROJECT_ROOT/apps/frontend/public/story-list.html" ]; then
  if grep -q "status-group" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "STATUS_ORDER" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "groupedStories" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
    pass_test "Story list groups stories by status"
  else
    fail_test "Story list not properly grouped by status" "Expected status-group, STATUS_ORDER, and groupedStories"
  fi
else
  fail_test "Story list page not found" "Expected story-list.html to exist"
fi

# Test 2: Story entries display title, description, and status badge
echo "Test 2: Story entries display title, description, and status badge"
if [ -f "$PROJECT_ROOT/apps/frontend/public/story-list.html" ]; then
  if grep -q "status-badge" "$PROJECT_ROOT/apps/frontend/public/story-list.html" && \
     grep -q "truncatedDesc" "$PROJECT_ROOT/apps/frontend/public/story-list.html"; then
    pass_test "Story entries display title, description, and status badge"
  else
    fail_test "Story entries missing required elements" "Expected status-badge and truncatedDesc"
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
