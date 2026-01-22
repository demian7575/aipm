#!/bin/bash
# Phase 2: Complete E2E Workflow (REAL Kiro CLI)

set +e
source "$(dirname "$0")/test-library.sh"

API_BASE="${API_BASE:-http://44.197.204.18:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://100.28.131.76:8081}"

# Disable Kiro Mock Mode (use real Kiro CLI)
export USE_KIRO_MOCK=false

echo "🎯 Phase 2: Complete E2E Workflow (REAL Kiro CLI)"
echo "Testing full user journey with real AI features"
echo ""

# Step 1: Create User Story
echo "📝 Step 1: Create User Story"
step_start=$(date +%s)
test_story_crud "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 1 Duration: $((step_end - step_start))s"

# Step 2: INVEST Analysis SSE (Real)
echo ""
echo "🤖 Step 2: INVEST Analysis SSE (Real)"
step_start=$(date +%s)
test_invest_analysis_sse "$API_BASE" "$KIRO_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 2 Duration: $((step_end - step_start))s"

# Step 3: Edit User Story (included in CRUD)
echo ""
echo "✏️  Step 3: Edit User Story (covered in CRUD)"

# Step 4: Story Hierarchy Check
echo ""
echo "🌳 Step 4: Story Hierarchy Check"
step_start=$(date +%s)
test_story_hierarchy "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 4 Duration: $((step_end - step_start))s"

# Step 5: Create Acceptance Tests
echo ""
echo "✅ Step 5: Create Acceptance Tests"
step_start=$(date +%s)
test_story_with_acceptance_tests "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 5 Duration: $((step_end - step_start))s"

# Step 6: GWT Health Check (already in Phase 1, skip)
echo ""
echo "🏥 Step 6: GWT Health Check (covered in Phase 1)"

# Step 7: GitHub Integration (PR Creation)
echo ""
echo "🔀 Step 7: GitHub Integration (PR Creation)"
step_start=$(date +%s)
test_pr_creation "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 7 Duration: $((step_end - step_start))s"

# Step 8: Code Generation (Real)
echo ""
echo "💻 Step 8: Code Generation (Real)"
step_start=$(date +%s)
test_code_generation_endpoint "$KIRO_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 8 Duration: $((step_end - step_start))s"

# Step 9: Deploy to PR & Data Consistency
echo ""
echo "🚀 Step 9: Deploy to PR & Data Consistency"
step_start=$(date +%s)
test_story_status_workflow "$API_BASE"
test_data_consistency "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 9 Duration: $((step_end - step_start))s"

# Step 10: Delete User Story (included in CRUD)
echo ""
echo "🗑️  Step 10: Delete User Story (covered in CRUD)"

echo ""
echo "✅ Phase 2 completed (Real workflow)"
echo "📊 Real Workflow Summary:"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"

