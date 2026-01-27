#!/bin/bash
# Phase 4: Story-specific functionality tests
# Tests acceptance criteria for individual user stories

set -e

echo "=========================================="
echo "Phase 4: Story Functionality Tests"
echo "=========================================="
echo ""

FAILED_TESTS=()
PASSED_TESTS=()

# Run all story tests
for test_file in tests/phase4-functionality/test-story-*.sh; do
  if [ -f "$test_file" ]; then
    echo "Running: $test_file"
    if bash "$test_file"; then
      PASSED_TESTS+=("$test_file")
    else
      FAILED_TESTS+=("$test_file")
      echo "❌ Test failed: $test_file"
    fi
    echo ""
  fi
done

# Summary
echo "=========================================="
echo "Phase 4 Test Summary"
echo "=========================================="
echo "Passed: ${#PASSED_TESTS[@]}"
echo "Failed: ${#FAILED_TESTS[@]}"

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  exit 1
fi

echo ""
echo "✅ ALL PHASE 4 TESTS PASSED"
