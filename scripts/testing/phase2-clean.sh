#!/bin/bash
# Phase 2: Complete E2E Workflow (REAL Kiro CLI) - Revised

set +e
source "$(dirname "$0")/test-library.sh"

API_BASE="${API_BASE:-http://3.92.96.67:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://3.92.96.67:8083}"

# Disable Kiro Mock Mode (use real Kiro CLI)
export USE_KIRO_MOCK=false

echo "🎯 Phase 2: Complete E2E Workflow (REAL Kiro CLI)"
echo "Testing full user journey with real AI features"
echo ""

# Step 0: Story Draft Generation (AI)
echo "📝 Step 0: Story Draft Generation (AI)"
step_start=$(date +%s)
test_story_draft_generation "$SEMANTIC_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 0 Duration: $((step_end - step_start))s"

# Step 1: Create User Story from Draft (includes INVEST Analysis automatically)
echo ""
echo "📝 Step 1: Create User Story from Draft"
step_start=$(date +%s)
test_story_creation_from_draft "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 1 Duration: $((step_end - step_start))s"

# Step 2: Acceptance Test Draft Generation (AI)
echo ""
echo "✏️  Step 2: Acceptance Test Draft Generation (AI)"
step_start=$(date +%s)
test_acceptance_test_draft_generation "$SEMANTIC_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 2 Duration: $((step_end - step_start))s"

# Step 3: Create Acceptance Test for Story from Step 1
echo ""
echo "✅ Step 3: Create Acceptance Test"
step_start=$(date +%s)
test_acceptance_test_creation_for_story "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 3 Duration: $((step_end - step_start))s"

# Step 4: GitHub Integration (PR Creation with Mock)
echo ""
echo "🔀 Step 4: GitHub Integration (PR Creation - Mock)"
step_start=$(date +%s)
test_pr_creation_mock "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 4 Duration: $((step_end - step_start))s"

# Step 5: Code Generation (Real)
echo ""
echo "💻 Step 5: Code Generation (Real)"
step_start=$(date +%s)
test_code_generation_endpoint "$SEMANTIC_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 5 Duration: $((step_end - step_start))s"

# Step 6: Story Status Update (Draft → Ready)
echo ""
echo "🚀 Step 6: Story Status Update (Draft → Ready)"
step_start=$(date +%s)
test_story_status_update "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 6 Duration: $((step_end - step_start))s"

# Step 7: Data Consistency Verification
echo ""
echo "🔍 Step 7: Data Consistency Verification"
step_start=$(date +%s)
test_data_consistency_verification "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 7 Duration: $((step_end - step_start))s"

# Step 8: User Story Deletion (Cascade)
echo ""
echo "🗑️  Step 8: User Story Deletion (Cascade)"
step_start=$(date +%s)
test_story_deletion_cascade "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 8 Duration: $((step_end - step_start))s"

echo ""
echo "✅ Phase 2 completed (Real workflow)"
echo "📊 Real Workflow Summary:"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"
