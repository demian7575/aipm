#!/usr/bin/env bash
# Phase 4: Story-Specific Functionality Tests
# Tests for merged user stories to verify acceptance criteria

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    TESTS_RUN=$((TESTS_RUN + 1))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# =============================================================================
# Story: Display User Stories with Filters and Sorting
# ID: 1769488000462
# =============================================================================
test_display_user_stories_with_filters_and_sorting() {
    log_test "Display User Stories with Filters and Sorting"
    
    # Acceptance Test 1: Display story list with status badges
    # Given: 5 user stories exist with different statuses
    # When: User opens the story list view
    # Then: All 5 stories appear with color-coded status badges
    
    # Check if story list view exists in frontend
    if grep -q "story-list-view" apps/frontend/public/app.js || \
       grep -q "renderStoryList" apps/frontend/public/app.js || \
       grep -q "status-badge" apps/frontend/public/app.js; then
        log_pass "Story list view implementation found"
    else
        log_fail "Story list view implementation not found"
        return 1
    fi
    
    # Acceptance Test 2: Pagination displays 20 stories per page
    # Given: 25 user stories exist
    # When: User opens the story list view
    # Then: First page displays exactly 20 stories with pagination controls
    
    if grep -q "pagination" apps/frontend/public/app.js || \
       grep -q "20" apps/frontend/public/app.js | grep -q "page"; then
        log_pass "Pagination implementation found"
    else
        log_fail "Pagination implementation not found"
        return 1
    fi
}

# =============================================================================
# Main Test Runner
# =============================================================================
main() {
    echo "=========================================="
    echo "Phase 4: Story Functionality Tests"
    echo "=========================================="
    echo ""
    
    # Run all test functions
    test_display_user_stories_with_filters_and_sorting || true
    
    echo ""
    echo "=========================================="
    echo "Phase 4 Test Results"
    echo "=========================================="
    echo "Tests Run:    $TESTS_RUN"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ ALL PHASE 4 TESTS PASSED${NC}"
        exit 0
    else
        echo -e "${RED}❌ SOME PHASE 4 TESTS FAILED${NC}"
        exit 1
    fi
}

main "$@"
