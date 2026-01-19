#!/bin/bash
# Phase 2-1: Complete E2E Workflow (MOCK Kiro CLI)

set +e
source "$(dirname "$0")/test-library.sh"

API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

# Enable Kiro Mock Mode
export USE_KIRO_MOCK=true

echo "🧪 Phase 2-1: Complete E2E Workflow (MOCK Kiro CLI)"
echo "Testing full user journey with mocked AI features"
echo ""

# Step 1: Create User Story
echo "📝 Step 1: Create User Story"
test_story_crud "$API_BASE"

# Step 2: INVEST Analysis SSE (Mock)
echo ""
echo "🤖 Step 2: INVEST Analysis SSE (Mock)"
test_invest_analysis_sse "$API_BASE" "$KIRO_API_BASE"

# Step 3: Edit User Story (included in CRUD)
echo ""
echo "✏️  Step 3: Edit User Story (covered in CRUD)"

# Step 4: Story Hierarchy Check
echo ""
echo "🌳 Step 4: Story Hierarchy Check"
test_story_hierarchy "$API_BASE"

# Step 5: Create Acceptance Tests
echo ""
echo "✅ Step 5: Create Acceptance Tests"
test_story_with_acceptance_tests "$API_BASE"

# Step 6: GWT Health Check (already in Phase 1, skip)
echo ""
echo "🏥 Step 6: GWT Health Check (covered in Phase 1)"

# Step 7: GitHub Integration (PR Creation)
echo ""
echo "🔀 Step 7: GitHub Integration (PR Creation)"
test_pr_creation "$API_BASE"

# Step 8: Code Generation (Mock)
echo ""
echo "💻 Step 8: Code Generation (Mock)"
test_code_generation_endpoint "$KIRO_API_BASE"

# Step 9: Deploy to PR & Data Consistency
echo ""
echo "🚀 Step 9: Deploy to PR & Data Consistency"
test_data_consistency "$API_BASE"

# Step 10: Delete User Story (included in CRUD)
echo ""
echo "🗑️  Step 10: Delete User Story (covered in CRUD)"

echo ""
echo "✅ Phase 2-1 completed (Mock workflow)"
echo "📊 Mock Workflow Summary:"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"
