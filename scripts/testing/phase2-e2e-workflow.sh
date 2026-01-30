#!/bin/bash
# Phase 2: UI-Driven Complete E2E Workflow (Real System Simulation)
# Tests complete user journey through UI button interactions
# Always uses Development DynamoDB for data isolation

set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-library.sh"

# Default to Development environment, but can be overridden for post-deployment tests
API_BASE="${API_BASE:-http://44.222.168.46:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://44.222.168.46:8083}"

# Always use Development DynamoDB for all gating tests
# If using Production backend, add header to use Development tables
USE_DEV_TABLES_HEADER=""
if [[ "$API_BASE" == *"44.197.204.18"* ]]; then
    USE_DEV_TABLES_HEADER="-H 'X-Use-Dev-Tables: true'"
    echo "🔧 Using Production EC2 with Development DynamoDB (via X-Use-Dev-Tables header)"
else
    echo "🔧 Using Development EC2 with Development DynamoDB"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 PHASE 2: UI-Driven Complete E2E Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing full user journey via UI button clicks"
echo "Backend: $API_BASE"
echo "Database: Development DynamoDB (data isolation)"
echo ""

# Global variables for story tracking
PHASE2_PARENT_STORY_ID=""
PHASE2_CHILD_STORY_ID=""
PHASE2_STORY_DRAFT=""
PHASE2_ACCEPTANCE_TEST_DRAFT=""
PHASE2_PR_NUMBER=""
PHASE2_BRANCH_NAME=""

# ============================================================================
# Step 1: Story Draft Generation
# UI: "Create Child Story" button → "Generate" button with Idea
# ============================================================================
phase2_step1_story_draft_generation() {
    echo "📝 Step 1: Story Draft Generation"
    echo "   UI: 'Create Child Story' → 'Generate' with Idea"
    step_start=$(date +%s)
    
    log_test "Story Draft Generation (SSE)"
    
    # Get parent story ID
    local parent_story=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories" | jq -r '.[0] | select(.id != null) | .id')
    if [[ -z "$parent_story" ]]; then
        fail_test "Story Draft Generation (No parent story found)"
        return
    fi
    PHASE2_PARENT_STORY_ID="$parent_story"
    echo "   📍 Parent Story ID: $PHASE2_PARENT_STORY_ID"
    
    # Generate story draft via SSE with simple, INVEST-compliant idea
    local request_id="phase2-story-draft-$(date +%s)"
    local response
    response=$(timeout 120 curl -s -N -X POST "$SEMANTIC_API_BASE/aipm/story-draft?stream=true" \
        -H 'Content-Type: application/json' \
        -d "{
            \"requestId\":\"$request_id\",
            \"featureDescription\":\"As a user, I want a button in the header that opens a modal showing a simple list of story titles, so I can quickly see all stories.\",
            \"parentId\":$PHASE2_PARENT_STORY_ID,
            \"components\":[\"WorkModel\"]
        }" 2>&1)
    
    if [[ $? -ne 0 ]]; then
        fail_test "Story Draft Generation (Timeout or connection error)"
        return
    fi
    
    # Parse SSE response
    local draft_data=$(echo "$response" | parse_sse_response)
    
    # Check for errors first (both .error field and status: 'error')
    if json_check "$draft_data" '.error' || json_check "$draft_data" '.status == "error"'; then
        fail_test "Story Draft Generation (Error in response)"
        echo "   ❌ Error: $(echo "$draft_data" | jq -r '.error // .message // "Unknown error"')"
        return
    fi
    
    # Check if response has nested story object (new format) or flat structure (old format)
    if json_check "$draft_data" '.story.title' && json_check "$draft_data" '.status == "complete"'; then
        # New format: story is nested under .story
        PHASE2_STORY_DRAFT=$(echo "$draft_data" | jq '.story')
        pass_test "Story Draft Generation (SSE)"
        echo "   ✅ Draft Title: $(echo "$draft_data" | jq -r '.story.title')"
    elif json_check "$draft_data" '.title' && json_check "$draft_data" '.status == "complete"'; then
        # Old format: flat structure
        PHASE2_STORY_DRAFT="$draft_data"
        pass_test "Story Draft Generation (SSE)"
        echo "   ✅ Draft Title: $(echo "$draft_data" | jq -r '.title')"
    else
        fail_test "Story Draft Generation (Invalid or incomplete response)"
        echo "   ❌ Expected status 'complete' with title, got: $(echo "$draft_data" | jq -r '.status // "none"')"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 1 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 2: Create Story from Draft
# UI: "Create Story" button
# ============================================================================
phase2_step2_create_story() {
    echo "📝 Step 2: Create Story from Draft"
    echo "   UI: 'Create Story' button"
    step_start=$(date +%s)
    
    log_test "Create Story from Draft"
    
    if [[ -z "$PHASE2_STORY_DRAFT" ]]; then
        fail_test "Create Story from Draft (No draft available)"
        return
    fi
    
    # Extract draft data and create story
    local story_payload=$(echo "$PHASE2_STORY_DRAFT" | jq '{
        title, description, asA, iWant, soThat, components,
        storyPoint, assigneeEmail, parentId, acceptWarnings,
        acceptanceTests
    }')
    
    local response
    response=$(curl -s $USE_DEV_TABLES_HEADER -X POST "$API_BASE/api/stories" \
        -H 'Content-Type: application/json' \
        -d "$story_payload")
    
    if json_check "$response" '.id'; then
        PHASE2_CHILD_STORY_ID=$(echo "$response" | jq -r '.id')
        pass_test "Create Story from Draft"
        echo "   ✅ Story ID: $PHASE2_CHILD_STORY_ID"
        echo "   ✅ Title: $(echo "$response" | jq -r '.title')"
    else
        fail_test "Create Story from Draft (Creation failed)"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 2 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 3: Edit Story
# UI: "Edit Story" button → Edit fields → Save
# ============================================================================
phase2_step3_edit_story() {
    echo "✏️  Step 3: Edit Story"
    echo "   UI: 'Edit Story' button → Modify → Save"
    step_start=$(date +%s)
    
    log_test "Edit Story"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "Edit Story (No story ID)"
        return
    fi
    
    # Update story with simple requirement for faster code generation
    local updated_payload=$(cat <<EOF
{
    "title": "Add Story List Button",
    "description": "As a user, I want a button in the header that opens a modal showing a simple list of story titles, so I can quickly see all stories.",
    "storyPoint": 2,
    "status": "Ready"
}
EOF
)
    
    local response
    response=$(curl -s $USE_DEV_TABLES_HEADER -X PUT "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID" \
        -H 'Content-Type: application/json' \
        -d "$updated_payload")
    
    if json_check "$response" '.success' 'true' || json_check "$response" '.message'; then
        pass_test "Edit Story"
        echo "   ✅ Story updated successfully"
    else
        fail_test "Edit Story (Update failed)"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 3 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 4: INVEST Analysis
# UI: "Run AI check" button
# ============================================================================
phase2_step4_invest_analysis() {
    echo "🤖 Step 4: INVEST Analysis (SSE)"
    echo "   UI: 'Run AI check' button"
    step_start=$(date +%s)
    
    log_test "INVEST Analysis (SSE)"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "INVEST Analysis (No story ID)"
        return
    fi
    
    # Get story data
    local story_data=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID")
    
    if ! json_check "$story_data" '.id'; then
        fail_test "INVEST Analysis (Story not found)"
        return
    fi
    
    # Run INVEST analysis via SSE with increased timeout
    local request_id="phase2-invest-$(date +%s)"
    local response
    response=$(timeout 60 curl -s -N -X POST "$SEMANTIC_API_BASE/aipm/invest-analysis?stream=true" \
        -H 'Content-Type: application/json' \
        -d "{
            \"requestId\":\"$request_id\",
            \"story\": $(echo "$story_data" | jq -c '.')
        }" 2>&1)
    
    if [[ $? -ne 0 ]]; then
        fail_test "INVEST Analysis (Timeout or connection error)"
        return
    fi
    
    # Parse SSE response
    local analysis_data=$(echo "$response" | parse_sse_response)
    
    # Check for errors first (both .error field and status: 'error')
    if json_check "$analysis_data" '.error' || json_check "$analysis_data" '.status == "error"'; then
        fail_test "INVEST Analysis (Error in response)"
        echo "   ❌ Error: $(echo "$analysis_data" | jq -r '.error // .message // "Unknown error"')"
        return
    fi
    
    if json_check "$analysis_data" '.score' && json_check "$analysis_data" '.status == "complete"'; then
        local score=$(echo "$analysis_data" | jq -r '.score')
        local summary=$(echo "$analysis_data" | jq -r '.summary')
        
        echo "   ✅ Score: $score"
        echo "   ✅ Summary: $summary"
        
        # Validate score threshold (minimum 60 for test environment)
        local min_score=60
        if [[ $score -lt $min_score ]]; then
            fail_test "INVEST Analysis (Score too low: $score < $min_score)"
            echo "   ❌ INVEST score must be at least $min_score for test to pass"
            echo "   ❌ This indicates the story draft has quality issues"
            return
        fi
        
        pass_test "INVEST Analysis (SSE)"
    else
        fail_test "INVEST Analysis (Invalid or incomplete response)"
        echo "   ❌ Expected status 'complete' with score, got: $(echo "$analysis_data" | jq -r '.status // "none"')"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 4 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 5: Acceptance Test Draft Generation
# UI: "Create Acceptance Test" button → "Generate Tests" with Idea
# ============================================================================
phase2_step5_acceptance_test_draft() {
    echo "✅ Step 5: Acceptance Test Draft Generation (SSE)"
    echo "   UI: 'Create Acceptance Test' → 'Generate Tests' with Idea"
    step_start=$(date +%s)
    
    log_test "Acceptance Test Draft Generation (SSE)"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "Acceptance Test Draft (No story ID)"
        return
    fi
    
    # Get story data
    local story_data=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID")
    
    # Generate acceptance test draft via SSE
    local request_id="phase2-at-draft-$(date +%s)"
    local response
    response=$(timeout 120 curl -s -N -X POST "$SEMANTIC_API_BASE/aipm/acceptance-test-draft?stream=true" \
        -H 'Content-Type: application/json' \
        -d "{
            \"requestId\":\"$request_id\",
            \"storyId\":$PHASE2_CHILD_STORY_ID,
            \"title\":$(echo "$story_data" | jq -c '.title'),
            \"description\":$(echo "$story_data" | jq -c '.description'),
            \"idea\":\"Test OAuth2 login flow with Google provider\"
        }" 2>&1)
    
    if [[ $? -ne 0 ]]; then
        fail_test "Acceptance Test Draft (Timeout or connection error)"
        return
    fi
    
    # Parse SSE response
    local draft_data=$(echo "$response" | parse_sse_response)
    
    # Check for errors first (both .error field and status: 'error')
    if json_check "$draft_data" '.error' || json_check "$draft_data" '.status == "error"'; then
        fail_test "Acceptance Test Draft (Error in response)"
        echo "   ❌ Error: $(echo "$draft_data" | jq -r '.error // .message // "Unknown error"')"
        return
    fi
    
    # Check if response has nested acceptanceTest object (new format) or flat structure (old format)
    if json_check "$draft_data" '.acceptanceTest.title' && json_check "$draft_data" '.status == "complete"'; then
        # New format: test is nested under .acceptanceTest
        PHASE2_ACCEPTANCE_TEST_DRAFT=$(echo "$draft_data" | jq '.acceptanceTest')
        pass_test "Acceptance Test Draft Generation (SSE)"
        echo "   ✅ Test Title: $(echo "$draft_data" | jq -r '.acceptanceTest.title')"
    elif json_check "$draft_data" '.title' && json_check "$draft_data" '.status == "complete"'; then
        # Old format: flat structure
        PHASE2_ACCEPTANCE_TEST_DRAFT="$draft_data"
        pass_test "Acceptance Test Draft Generation (SSE)"
        echo "   ✅ Test Title: $(echo "$draft_data" | jq -r '.title')"
    else
        fail_test "Acceptance Test Draft (Invalid or incomplete response)"
        echo "   ❌ Expected status 'complete' with title, got: $(echo "$draft_data" | jq -r '.status // "none"')"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 5 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 6: Create PR (Real GitHub PR)
# UI: "Create PR" button
# ============================================================================
phase2_step6_create_pr() {
    echo "🔀 Step 6: Create PR"
    echo "   UI: 'Create PR' button"
    step_start=$(date +%s)
    
    log_test "Create PR (Real GitHub)"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "Create PR (No story ID)"
        return
    fi
    
    # Get story data for PR
    local story_data=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID")
    local story_title=$(echo "$story_data" | jq -r '.title')
    
    # Generate branch name
    PHASE2_BRANCH_NAME="feature/story-$PHASE2_CHILD_STORY_ID"
    
    # Create PR via API
    local pr_payload=$(cat <<EOF
{
    "storyId": $PHASE2_CHILD_STORY_ID,
    "branchName": "$PHASE2_BRANCH_NAME",
    "prTitle": "feat: $story_title",
    "prBody": "Implements story #$PHASE2_CHILD_STORY_ID\n\n$story_title"
}
EOF
)
    
    local response
    response=$(curl -s $USE_DEV_TABLES_HEADER -X POST "$API_BASE/api/create-pr" \
        -H 'Content-Type: application/json' \
        -d "$pr_payload")
    
    if json_check "$response" '.success' 'true' && json_check "$response" '.prNumber'; then
        PHASE2_PR_NUMBER=$(echo "$response" | jq -r '.prNumber')
        local pr_url=$(echo "$response" | jq -r '.prUrl')
        pass_test "Create PR (Real GitHub)"
        echo "   ✅ PR #$PHASE2_PR_NUMBER created"
        echo "   ✅ Branch: $PHASE2_BRANCH_NAME"
        echo "   ✅ URL: $pr_url"
    else
        fail_test "Create PR (Creation failed)"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 6 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 7: Generate Code (Real commit to PR)
# UI: "Generate Code" button
# ============================================================================
phase2_step7_generate_code() {
    echo "💻 Step 7: Generate Code"
    echo "   UI: 'Generate Code' button"
    step_start=$(date +%s)
    
    log_test "Generate Code (Real)"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "Generate Code (No story ID)"
        return
    fi
    
    if [[ -z "$PHASE2_PR_NUMBER" ]] || [[ -z "$PHASE2_BRANCH_NAME" ]]; then
        fail_test "Generate Code (No PR information)"
        return
    fi
    
    # Call Semantic API with real code generation template
    local request_id="phase2-codegen-$(date +%s)"
    local response
    
    echo "   📍 Generating code for PR #$PHASE2_PR_NUMBER"
    echo "   📍 Branch: $PHASE2_BRANCH_NAME"
    
    response=$(timeout 600 curl -s -N -X POST "$SEMANTIC_API_BASE/aipm/code-generation?stream=true" \
        -H 'Content-Type: application/json' \
        -d "{
            \"requestId\":\"$request_id\",
            \"storyId\":$PHASE2_CHILD_STORY_ID,
            \"branchName\":\"$PHASE2_BRANCH_NAME\",
            \"prNumber\":$PHASE2_PR_NUMBER,
            \"skipGatingTests\":true
        }" 2>&1)
    
    if [[ $? -ne 0 ]]; then
        fail_test "Generate Code (Timeout or connection error)"
        return
    fi
    
    # Parse SSE response
    local code_data=$(echo "$response" | parse_sse_response)
    
    # Check for errors first (both .error field and status: 'error')
    if json_check "$code_data" '.error' || json_check "$code_data" '.status == "error"'; then
        fail_test "Generate Code (Error in response)"
        echo "   ❌ Error: $(echo "$code_data" | jq -r '.error // .message // "Unknown error"')"
        echo "   ❌ Response: $response"
        return
    fi
    
    # Check for successful completion
    if json_check "$code_data" '.status == "complete"' || json_check "$code_data" '.status == "success"'; then
        pass_test "Generate Code (Real)"
        echo "   ✅ Code generated and committed to PR #$PHASE2_PR_NUMBER"
    else
        fail_test "Generate Code (Invalid or incomplete response)"
        echo "   ❌ Expected status 'complete' or 'success', got: $(echo "$code_data" | jq -r '.status // "none"')"
        echo "   ❌ Response: $response"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 7 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 8: Test in Dev (Deploy to PR)
# UI: "Test in Dev" button
# ============================================================================
phase2_step8_test_in_dev() {
    echo "🚀 Step 8: Test in Dev"
    echo "   UI: 'Test in Dev' button"
    step_start=$(date +%s)
    
    log_test "Deploy to Dev & Data Consistency"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "Test in Dev (No story ID)"
        return
    fi
    
    # Check data consistency
    local story_check=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID")
    
    if json_check "$story_check" '.id' && json_check "$story_check" '.title'; then
        pass_test "Deploy to Dev & Data Consistency"
        echo "   ✅ Story data consistent"
        echo "   ✅ Ready for dev deployment"
    else
        fail_test "Test in Dev (Data inconsistency)"
        echo "   ❌ Story check: $story_check"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 8 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 9: Stop Tracking (Delete PR)
# UI: "Stop tracking" button
# ============================================================================
phase2_step9_stop_tracking() {
    echo "🛑 Step 9: Stop Tracking (Delete PR)"
    echo "   UI: 'Stop tracking' button"
    step_start=$(date +%s)
    
    log_test "Stop Tracking (Delete PR)"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]] || [[ -z "$PHASE2_PR_NUMBER" ]]; then
        fail_test "Stop Tracking (No story or PR information)"
        return
    fi
    
    # Delete PR via API (closes GitHub PR and removes from DB)
    local response
    response=$(curl -s $USE_DEV_TABLES_HEADER -X DELETE "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID/prs/$PHASE2_PR_NUMBER")
    
    # Verify PR was deleted
    sleep 2
    local verify=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID/prs")
    
    if ! echo "$verify" | jq -e ".[] | select(.number == $PHASE2_PR_NUMBER)" > /dev/null 2>&1; then
        pass_test "Stop Tracking (Delete PR)"
        echo "   ✅ PR #$PHASE2_PR_NUMBER deleted"
        echo "   ✅ GitHub PR closed"
    else
        fail_test "Stop Tracking (PR still exists)"
        echo "   ❌ PR verification: $verify"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 9 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Step 10: Delete Story
# UI: "Delete" button
# ============================================================================
phase2_step10_delete_story() {
    echo "🗑️  Step 10: Delete Story"
    echo "   UI: 'Delete' button"
    step_start=$(date +%s)
    
    log_test "Delete Story"
    
    if [[ -z "$PHASE2_CHILD_STORY_ID" ]]; then
        fail_test "Delete Story (No story ID)"
        return
    fi
    
    # Delete story
    local response
    response=$(curl -s $USE_DEV_TABLES_HEADER -X DELETE "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID")
    
    # Verify deletion
    sleep 1
    local verify=$(curl -s $USE_DEV_TABLES_HEADER "$API_BASE/api/stories/$PHASE2_CHILD_STORY_ID")
    
    if json_check "$verify" '.message' '"Story not found"' || json_check "$verify" '.error' || [[ "$verify" == "null" ]] || [[ -z "$verify" ]]; then
        pass_test "Delete Story"
        echo "   ✅ Story deleted successfully"
    else
        fail_test "Delete Story (Deletion failed)"
        echo "   ❌ Story still exists: $verify"
    fi
    
    step_end=$(date +%s)
    echo "   ⏱️  Step 10 Duration: $((step_end - step_start))s"
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

phase2_start=$(date +%s)

phase2_step1_story_draft_generation
phase2_step2_create_story
phase2_step3_edit_story
phase2_step4_invest_analysis
phase2_step5_acceptance_test_draft
phase2_step6_create_pr
phase2_step7_generate_code
phase2_step8_test_in_dev
phase2_step9_stop_tracking
phase2_step10_delete_story

phase2_end=$(date +%s)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Phase 2 completed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get actual test counts from test framework
PHASE_PASSED=$(get_passed_count)
PHASE_FAILED=$(get_failed_count)

echo "📊 Phase 2 Summary:"
echo "   Tests Passed: $PHASE_PASSED"
echo "   Tests Failed: $PHASE_FAILED"
echo "   Total Duration: $((phase2_end - phase2_start))s"
echo "   Environment: Development (Data Isolation)"
echo ""

# Exit with failure if any tests failed
if [[ $PHASE_FAILED -gt 0 ]]; then
    echo "❌ Phase 2 FAILED: $PHASE_FAILED test(s) failed"
    return 1
fi

echo "✅ Phase 2 PASSED - E2E workflow validated"
return 0
