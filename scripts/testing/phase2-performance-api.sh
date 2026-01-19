#!/bin/bash
# Phase 2: Complete User Workflow (Step-by-Step)
# Tests the full workflow: Story → Acceptance Test → PR → Status → Consistency

set +e  # Don't exit on error - we want to run all tests
source "$(dirname "$0")/test-library.sh"

API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"

echo "🎯 Phase 2: Complete User Workflow (Step-by-Step)"
echo "Environment: $API_BASE"
echo ""

# Step 1: Basic CRUD operations
echo "📝 Step 1: Basic Story Operations"
test_story_crud "$API_BASE"
test_story_hierarchy "$API_BASE"

# Step 2: Story with acceptance tests
echo ""
echo "✅ Step 2: Story with Acceptance Tests"
test_story_with_acceptance_tests "$API_BASE"

# Step 3: Frontend integration
echo ""
echo "🌐 Step 3: Frontend Integration"
test_frontend_backend_integration "$FRONTEND_URL"

# Step 4: AI-powered features (with real Kiro)
echo ""
echo "🤖 Step 4: AI-Powered Features"
test_draft_generation_performance "$KIRO_API_BASE"
test_invest_analysis_sse "$KIRO_API_BASE"
test_code_generation_endpoint "$KIRO_API_BASE"

# Step 5: PR creation
echo ""
echo "🔀 Step 5: PR Creation"
test_pr_creation "$API_BASE"

# Step 6: Status workflow
echo ""
echo "🔄 Step 6: Status Workflow"
test_story_status_workflow "$API_BASE"

# Step 7: Data consistency
echo ""
echo "🔍 Step 7: Data Consistency"
test_data_consistency "$API_BASE"

echo ""
echo "✅ Phase 2 completed"
echo "📊 Complete Workflow Summary:"
echo "   Environment: $API_BASE"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"

