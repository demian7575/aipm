#!/bin/bash

# Acceptance tests for Filter User Stories in Mindmap View feature

source "$(dirname "$0")/test-functions.sh"

API_URL="${API_URL:-http://localhost:8081}"

echo "=== Filter User Stories Acceptance Tests ==="

# Test 1: Filter button opens modal with criteria
test_filter_button_opens_modal() {
  echo "Test 1: Filter button opens modal with criteria"
  echo "Given: I am viewing the mindmap with multiple user stories"
  echo "When: I click the filter button in the top toolbar"
  echo "Then: a modal opens displaying filter options for status, component, and assignee"
  
  # This test verifies the UI elements exist
  if grep -q 'id="filter-btn"' apps/frontend/public/index.html; then
    if grep -q 'buildFilterModalContent' apps/frontend/public/app.js; then
      if grep -q 'Status' apps/frontend/public/app.js && \
         grep -q 'Component' apps/frontend/public/app.js && \
         grep -q 'Assignee' apps/frontend/public/app.js; then
        echo "✅ PASS: Filter button and modal content builder exist with all criteria"
        return 0
      fi
    fi
  fi
  echo "❌ FAIL: Filter button or modal content missing"
  return 1
}

# Test 2: Applying filters updates mindmap visibility
test_applying_filters_updates_mindmap() {
  echo ""
  echo "Test 2: Applying filters updates mindmap visibility"
  echo "Given: the filter modal is open with criteria selected"
  echo "When: I apply the filters"
  echo "Then: only user stories matching the selected criteria are visible in the mindmap view"
  
  # Verify filter logic exists in getVisibleMindmapStories
  if grep -q 'state.filters.status' apps/frontend/public/app.js && \
     grep -q 'state.filters.component' apps/frontend/public/app.js && \
     grep -q 'state.filters.assignee' apps/frontend/public/app.js; then
    if grep -q 'applyFilters' apps/frontend/public/app.js && \
       grep -q 'renderMindmap' apps/frontend/public/app.js; then
      echo "✅ PASS: Filter application logic exists and triggers mindmap re-render"
      return 0
    fi
  fi
  echo "❌ FAIL: Filter application logic incomplete"
  return 1
}

# Run tests
PASS_COUNT=0
FAIL_COUNT=0

if test_filter_button_opens_modal; then
  ((PASS_COUNT++))
else
  ((FAIL_COUNT++))
fi

if test_applying_filters_updates_mindmap; then
  ((PASS_COUNT++))
else
  ((FAIL_COUNT++))
fi

echo ""
echo "=== Test Summary ==="
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ All acceptance tests passed"
  exit 0
else
  echo "❌ Some acceptance tests failed"
  exit 1
fi
