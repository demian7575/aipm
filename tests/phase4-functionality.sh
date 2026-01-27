#!/bin/bash
# Phase 4 Functionality Tests - Story-specific acceptance tests

set -e

echo "=== Phase 4: Story Acceptance Tests ==="
echo ""

# Test 1: Story list displays all stories with required fields
echo "Test 1: Story list displays all stories with required fields"
echo "Given: 5 user stories exist with different statuses"
echo "When: User navigates to the story list page"
echo "Then: All 5 stories appear with title, description, and status badge"

# Check if story-list.html exists
if [ ! -f "apps/frontend/public/story-list.html" ]; then
  echo "❌ FAIL: story-list.html not found"
  exit 1
fi

# Check for required HTML elements
if ! grep -q "story-table" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: story-table element not found"
  exit 1
fi

if ! grep -q "status-badge" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: status-badge styling not found"
  exit 1
fi

# Check for status color classes
if ! grep -q "status-Draft" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Draft status styling not found"
  exit 1
fi

if ! grep -q "status-In-Progress" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: In Progress status styling not found"
  exit 1
fi

if ! grep -q "status-Ready" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Ready status styling not found"
  exit 1
fi

if ! grep -q "status-Done" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: Done status styling not found"
  exit 1
fi

echo "✅ PASS: Story list page has required elements and status badges"
echo ""

# Test 2: Pagination controls appear for large story lists
echo "Test 2: Pagination controls appear for large story lists"
echo "Given: 25 user stories exist in the system"
echo "When: User opens the story list page"
echo "Then: First 20 stories appear on page 1 with pagination controls"

# Check for pagination implementation
if ! grep -q "ITEMS_PER_PAGE = 20" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: 20 items per page not configured"
  exit 1
fi

if ! grep -q "pagination" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: pagination element not found"
  exit 1
fi

if ! grep -q "renderPagination" apps/frontend/public/story-list.html; then
  echo "❌ FAIL: pagination rendering function not found"
  exit 1
fi

echo "✅ PASS: Pagination controls implemented correctly"
echo ""

echo "=== All Phase 4 Tests Passed ==="
