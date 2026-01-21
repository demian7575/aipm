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
test_story_draft_generation "$SEMANTIC_API_BASE"

# Step 1: Create User Story (includes INVEST Analysis automatically)
echo ""
echo "📝 Step 1: Create User Story (with INVEST Analysis)"
test_story_creation_only "$API_BASE"

# Step 2: Acceptance Test Draft Generation (AI)
echo ""
echo "✏️  Step 2: Acceptance Test Draft Generation (AI)"
test_acceptance_test_draft_generation "$SEMANTIC_API_BASE"

# Step 3: Create Acceptance Test from Draft
echo ""
echo "✅ Step 3: Create Acceptance Test"
test_acceptance_test_creation "$API_BASE"

# Step 4: Story Hierarchy Check
echo ""
echo "🌳 Step 4: Story Hierarchy Check"
test_story_hierarchy "$API_BASE"

# Step 5: GitHub Integration (PR Creation)
echo ""
echo "🔀 Step 5: GitHub Integration (PR Creation)"
test_pr_creation "$API_BASE"

# Step 6: Code Generation (Real)
echo ""
echo "💻 Step 6: Code Generation (Real)"
test_code_generation_endpoint "$SEMANTIC_API_BASE"

# Step 7: User Story Deletion (with cascading deletes)
echo ""
echo "🗑️  Step 7: User Story Deletion (Cascade)"
test_story_deletion_cascade "$API_BASE"

echo ""
echo "✅ Phase 2 completed (Real workflow)"
echo "📊 Real Workflow Summary:"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"
