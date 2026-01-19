#!/bin/bash
# Phase 3: Complete End-to-End User Journey Test
# Tests the full workflow from story creation to PR merge

set +e  # Don't exit on error - we want to run all tests
source "$(dirname "$0")/test-library.sh"

# Use API_BASE from parent script, fallback to PROD
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

echo "🎯 Phase 3: Complete End-to-End User Journey"
echo "Testing: Story → Acceptance Test → PR → Status → Consistency"
echo "Environment: $API_BASE"
echo ""

# E2E journey tests
test_story_with_acceptance_tests "$API_BASE"
test_pr_creation "$API_BASE"
test_story_status_workflow "$API_BASE"
test_data_consistency "$API_BASE"

echo ""
echo "✅ Phase 3 completed"
echo "📊 End-to-End Journey Summary:"
echo "   Environment: $API_BASE"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"
