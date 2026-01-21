#!/bin/bash
# Phase 2: Complete E2E Workflow (Optimized)
# Replaces phase2-clean.sh and phase2-1-kiro-mock-tests.sh

set +e
source "$(dirname "$0")/test-library.sh"

# Load test environment configuration
if [[ -f "$(dirname "$0")/test-env-config.sh" ]]; then
  source "$(dirname "$0")/test-env-config.sh"
else
  # Default configuration
  export TEST_MODE="${TEST_MODE:-real}"
  export TEST_DB_ENV="${TEST_DB_ENV:-dev}"
  export TEST_USE_MOCK_GITHUB="${TEST_USE_MOCK_GITHUB:-true}"
  export TEST_API_BASE="${TEST_API_BASE:-http://localhost:4000}"
  export TEST_SEMANTIC_API_BASE="${TEST_SEMANTIC_API_BASE:-http://localhost:8083}"
  export USE_KIRO_MOCK="${USE_KIRO_MOCK:-false}"
fi

API_BASE="${TEST_API_BASE}"
SEMANTIC_API_BASE="${TEST_SEMANTIC_API_BASE}"
SSH_HOST="${TEST_SSH_HOST}"

echo "🎯 Phase 2: Complete E2E Workflow"
echo "Testing full user journey with configurable environment"
echo ""

# Step 0: Story Draft Generation (AI)
echo "📝 Step 0: Story Draft Generation (AI)"
step_start=$(date +%s)
test_story_draft_generation "$SEMANTIC_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 0 Duration: $((step_end - step_start))s"

# Step 1: Create User Story from Draft
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

# Step 3: Create Acceptance Test
echo ""
echo "✅ Step 3: Create Acceptance Test"
step_start=$(date +%s)
test_acceptance_test_verification "$API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 3 Duration: $((step_end - step_start))s"

# Step 4: GitHub Integration (Configurable: Real or Mock)
echo ""
if [[ "$TEST_USE_MOCK_GITHUB" == "true" ]]; then
  echo "🔀 Step 4: GitHub Integration (Mock)"
  step_start=$(date +%s)
  test_pr_creation_mock "$API_BASE"
  step_end=$(date +%s)
  echo "   ⏱️  Step 4 Duration: $((step_end - step_start))s"
else
  echo "🔀 Step 4: GitHub Integration (Real)"
  step_start=$(date +%s)
  test_pr_creation "$API_BASE"
  step_end=$(date +%s)
  echo "   ⏱️  Step 4 Duration: $((step_end - step_start))s"
fi

# Step 5: Code Generation (Real Semantic API)
echo ""
echo "💻 Step 5: Code Generation (Real)"
step_start=$(date +%s)
test_code_generation_endpoint "$SEMANTIC_API_BASE"
step_end=$(date +%s)
echo "   ⏱️  Step 5 Duration: $((step_end - step_start))s"

# Step 6: Story Status Update
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
test_data_consistency "$API_BASE"
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
echo "✅ Phase 2 completed"
echo "📊 Summary:"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"
echo "   Environment: $TEST_DB_ENV"
echo "   GitHub Mode: $([ "$TEST_USE_MOCK_GITHUB" == "true" ] && echo "Mock" || echo "Real")"
echo "   Kiro Mode: $([ "$USE_KIRO_MOCK" == "true" ] && echo "Mock" || echo "Real")"

