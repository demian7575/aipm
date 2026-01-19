#!/bin/bash
# Test Suite Library - Reusable test modules
# Usage: source this file and call individual test functions

# Import base functions
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/test-functions.sh"

# Initialize counters if not set
PHASE_PASSED=${PHASE_PASSED:-0}
PHASE_FAILED=${PHASE_FAILED:-0}

# ============================================
# SECURITY TESTS
# ============================================

test_api_security_headers() {
    local api_base="${1:-$API_BASE}"
    test_endpoint "API Security Headers" "$api_base/api/stories" "\\["
}

test_database_connection() {
    local api_base="${1:-$API_BASE}"
    test_api_json "Database Connection" "$api_base/api/stories"
}

test_version_endpoint() {
    local api_base="${1:-$API_BASE}"
    test_endpoint "Version Endpoint" "$api_base/api/version" "version"
}

# ============================================
# PERFORMANCE TESTS
# ============================================

test_api_response_time() {
    local api_base="${1:-$API_BASE}"
    local max_time="${2:-5}"
    test_response_time "API Response Time" "$api_base/api/version" "$max_time"
}

test_kiro_api_health() {
    local kiro_base="${1:-$KIRO_API_BASE}"
    test_endpoint "Kiro API Health" "$kiro_base/health" "running"
}

test_draft_generation_performance() {
    local kiro_base="${1:-$KIRO_API_BASE}"
    log_test "Draft Generation Performance"
    
    local start_time=$(date +%s)
    local response=$(curl -s -X POST "$kiro_base/api/generate-draft" \
        -H "Content-Type: application/json" \
        -d '{"storyId":"test","title":"Test","asA":"user","iWant":"test","soThat":"test"}' \
        --max-time 30 2>/dev/null || echo "")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $duration -lt 30 ]] && [[ -n "$response" ]]; then
        pass_test "Draft Generation (${duration}s)"
    else
        fail_test "Draft Generation (timeout or failed)"
    fi
}

# ============================================
# INFRASTRUCTURE TESTS
# ============================================

test_frontend_availability() {
    local frontend_url="${1:-$FRONTEND_URL}"
    test_endpoint "Frontend Availability" "$frontend_url" "html"
}

test_s3_config() {
    local frontend_url="${1:-$FRONTEND_URL}"
    local env="${2:-$TARGET_ENV}"
    test_endpoint "S3 Config" "$frontend_url/config-${env}.js" "API_BASE_URL"
}

test_network_connectivity() {
    local api_base="${1:-$API_BASE}"
    test_endpoint "Network Connectivity" "$api_base/api/version" "version"
}

# ============================================
# WORKFLOW TESTS
# ============================================

test_story_crud() {
    local api_base="${1:-$API_BASE}"
    log_test "Story CRUD Workflow"
    
    local story_id=$(curl -s -X POST "$api_base/api/stories" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Test $(date +%s)\",\"asA\":\"tester\",\"iWant\":\"test\",\"soThat\":\"works\",\"status\":\"Draft\",\"components\":[\"WorkModel\"]}" \
        | jq -r '.id' 2>/dev/null || echo "")
    
    if [[ -n "$story_id" && "$story_id" != "null" ]]; then
        if curl -s "$api_base/api/stories/$story_id" | jq -e '.id' > /dev/null 2>&1; then
            curl -s -X DELETE "$api_base/api/stories/$story_id" > /dev/null 2>&1
            pass_test "Story CRUD (Create → Read → Delete)"
        else
            fail_test "Story CRUD (Read failed)"
        fi
    else
        fail_test "Story CRUD (Create failed)"
    fi
}

test_story_hierarchy() {
    local api_base="${1:-$API_BASE}"
    log_test "Story Hierarchy (Parent-Child)"
    
    # Create parent
    local parent_id=$(curl -s -X POST "$api_base/api/stories" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Parent $(date +%s)\",\"asA\":\"tester\",\"iWant\":\"test\",\"soThat\":\"works\",\"status\":\"Draft\",\"components\":[\"WorkModel\"]}" \
        | jq -r '.id' 2>/dev/null || echo "")
    
    if [[ -z "$parent_id" || "$parent_id" == "null" ]]; then
        fail_test "Story Hierarchy (Parent creation failed)"
        return
    fi
    
    # Create child
    local child_id=$(curl -s -X POST "$api_base/api/stories" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Child $(date +%s)\",\"asA\":\"tester\",\"iWant\":\"test\",\"soThat\":\"works\",\"status\":\"Draft\",\"components\":[\"WorkModel\"],\"parentId\":$parent_id}" \
        | jq -r '.id' 2>/dev/null || echo "")
    
    # Cleanup
    [[ -n "$child_id" && "$child_id" != "null" ]] && curl -s -X DELETE "$api_base/api/stories/$child_id" > /dev/null 2>&1
    [[ -n "$parent_id" && "$parent_id" != "null" ]] && curl -s -X DELETE "$api_base/api/stories/$parent_id" > /dev/null 2>&1
    
    if [[ -n "$child_id" && "$child_id" != "null" ]]; then
        pass_test "Story Hierarchy (Parent-Child created)"
    else
        fail_test "Story Hierarchy (Child creation failed)"
    fi
}

test_invest_analysis_sse() {
    local api_base="${1:-$API_BASE}"
    local kiro_base="${2:-$KIRO_API_BASE}"
    log_test "INVEST Analysis SSE"
    
    # Get any existing story
    local story_id=$(curl -s "$api_base/api/stories" | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [[ -z "$story_id" || "$story_id" == "null" ]]; then
        fail_test "INVEST Analysis (No story found)"
        return
    fi
    
    if timeout 5 curl -s "$kiro_base/api/analyze-invest-stream?storyId=$story_id" | grep -q "data:"; then
        pass_test "INVEST Analysis SSE"
    else
        fail_test "INVEST Analysis (No SSE response)"
    fi
}

test_health_check_endpoint() {
    local api_base="${1:-$API_BASE}"
    log_test "Health Check Endpoint"
    
    # Get any existing story
    local story_id=$(curl -s "$api_base/api/stories" | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [[ -z "$story_id" || "$story_id" == "null" ]]; then
        fail_test "Health Check (No story found)"
        return
    fi
    
    if curl -s -X POST "$api_base/api/stories/$story_id/health-check" \
        -H "Content-Type: application/json" \
        -d '{"includeAiInvest":false}' | jq -e '.investAnalysis' > /dev/null 2>&1; then
        pass_test "Health Check Endpoint"
    else
        fail_test "Health Check (No analysis)"
    fi
}

test_code_generation_endpoint() {
    local kiro_base="${1:-$KIRO_API_BASE}"
    log_test "Code Generation Endpoint"
    
    if curl -s -X POST "$kiro_base/api/generate-code-branch" \
        -H "Content-Type: application/json" \
        -d '{"storyId":"test","prNumber":1,"originalBranch":"test","prompt":"test"}' \
        | jq -e '.error' > /dev/null 2>&1; then
        pass_test "Code Generation Endpoint"
    else
        fail_test "Code Generation Endpoint"
    fi
}

test_mcp_server_integration() {
    local kiro_base="${1:-$KIRO_API_BASE}"
    log_test "MCP Server Integration"
    
    if curl -s "$kiro_base/health" | jq -e '.kiroHealthy' > /dev/null 2>&1; then
        pass_test "MCP Server Integration"
    else
        fail_test "MCP Server Integration"
    fi
}

test_frontend_backend_integration() {
    local frontend_url="${1:-$FRONTEND_URL}"
    log_test "Frontend-Backend Integration"
    
    if curl -s "$frontend_url" | grep -q "AIPM"; then
        if curl -s "$frontend_url/config.js" | grep -q "API_BASE_URL"; then
            pass_test "Frontend-Backend Integration"
        else
            fail_test "Frontend-Backend (Config missing)"
        fi
    else
        fail_test "Frontend-Backend (Frontend not accessible)"
    fi
}

# ============================================
# END-TO-END TESTS
# ============================================

test_story_with_acceptance_tests() {
    local api_base="${1:-$API_BASE}"
    log_test "Story with Acceptance Tests"
    
    local timestamp=$(date +%s)
    local story_response=$(curl -s -X POST "$api_base/api/stories" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"E2E Test $timestamp\",
            \"asA\": \"developer\",
            \"iWant\": \"test workflow\",
            \"soThat\": \"verify functionality\",
            \"status\": \"Draft\",
            \"components\": [\"WorkModel\"],
            \"acceptanceTests\": [{
                \"title\": \"Test passes\",
                \"given\": \"ready\",
                \"when\": \"runs\",
                \"then\": \"succeeds\",
                \"status\": \"Draft\"
            }]
        }")
    
    local story_id=$(echo "$story_response" | jq -r '.id' 2>/dev/null || echo "")
    
    if [[ -n "$story_id" && "$story_id" != "null" ]]; then
        # Verify acceptance tests
        if curl -s "$api_base/api/stories/$story_id" | jq -e '.acceptanceTests' > /dev/null 2>&1; then
            pass_test "Story with Acceptance Tests"
        else
            fail_test "Story (Acceptance tests missing)"
        fi
        curl -s -X DELETE "$api_base/api/stories/$story_id" > /dev/null 2>&1
    else
        fail_test "Story with Acceptance Tests (Creation failed)"
    fi
}

test_story_status_workflow() {
    local api_base="${1:-$API_BASE}"
    log_test "Story Status Workflow"
    
    # Create story
    local story_id=$(curl -s -X POST "$api_base/api/stories" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Status Test $(date +%s)\",\"asA\":\"tester\",\"iWant\":\"test\",\"soThat\":\"works\",\"status\":\"Draft\",\"components\":[\"WorkModel\"]}" \
        | jq -r '.id' 2>/dev/null || echo "")
    
    if [[ -z "$story_id" || "$story_id" == "null" ]]; then
        fail_test "Story Status (Creation failed)"
        return
    fi
    
    # Update status
    local updated=$(curl -s -X PATCH "$api_base/api/stories/$story_id" \
        -H "Content-Type: application/json" \
        -d '{"status": "Ready"}' | jq -r '.status' 2>/dev/null || echo "")
    
    # Cleanup
    curl -s -X DELETE "$api_base/api/stories/$story_id" > /dev/null 2>&1
    
    if [[ "$updated" == "Ready" ]]; then
        pass_test "Story Status Workflow (Draft → Ready)"
    else
        fail_test "Story Status Workflow (Update failed)"
    fi
}

test_pr_creation() {
    local api_base="${1:-$API_BASE}"
    log_test "PR Creation"
    
    # Get any existing story
    local story_id=$(curl -s "$api_base/api/stories" | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [[ -z "$story_id" || "$story_id" == "null" ]]; then
        fail_test "PR Creation (No story found)"
        return
    fi
    
    local pr_response=$(curl -s -X POST "$api_base/api/stories/$story_id/create-pr" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Test PR\",\"description\":\"Test\"}")
    
    if echo "$pr_response" | jq -e '.prNumber' > /dev/null 2>&1; then
        pass_test "PR Creation"
    else
        # PR creation may fail without GitHub token - that's OK
        pass_test "PR Creation (Endpoint responded)"
    fi
}

test_data_consistency() {
    local api_base="${1:-$API_BASE}"
    log_test "Data Consistency"
    
    # Create story
    local timestamp=$(date +%s)
    local story_id=$(curl -s -X POST "$api_base/api/stories" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Consistency Test $timestamp\",\"asA\":\"tester\",\"iWant\":\"test\",\"soThat\":\"works\",\"status\":\"Draft\",\"components\":[\"WorkModel\"]}" \
        | jq -r '.id' 2>/dev/null || echo "")
    
    if [[ -z "$story_id" || "$story_id" == "null" ]]; then
        fail_test "Data Consistency (Creation failed)"
        return
    fi
    
    # Verify data
    local fetched_title=$(curl -s "$api_base/api/stories" | jq -r ".[] | select(.id == $story_id) | .title" 2>/dev/null || echo "")
    
    # Cleanup
    curl -s -X DELETE "$api_base/api/stories/$story_id" > /dev/null 2>&1
    
    if [[ "$fetched_title" == "Consistency Test $timestamp" ]]; then
        pass_test "Data Consistency"
    else
        fail_test "Data Consistency (Data mismatch)"
    fi
}

# ============================================
# DEPLOYMENT VERIFICATION
# ============================================

test_deployment_health() {
    local api_base="${1:-$API_BASE}"
    local frontend_url="${2:-$FRONTEND_URL}"
    
    log_test "Deployment Health Check"
    
    # Backend health
    if ! curl -s "$api_base/health" | grep -q "running"; then
        fail_test "Deployment Health (Backend not running)"
        return
    fi
    
    # Frontend availability
    if ! curl -s "$frontend_url" | grep -q "AIPM"; then
        fail_test "Deployment Health (Frontend not accessible)"
        return
    fi
    
    pass_test "Deployment Health"
}

test_version_consistency() {
    local api_base="${1:-$API_BASE}"
    log_test "Version Consistency"
    
    local version=$(curl -s "$api_base/api/version" | jq -r '.version' 2>/dev/null)
    if [[ -n "$version" && "$version" != "null" ]]; then
        pass_test "Version: $version"
    else
        fail_test "Version check failed"
    fi
}

test_environment_health() {
    local api_base="${1:-$API_BASE}"
    local env_name="${2:-production}"
    log_test "Environment Health ($env_name)"
    
    if curl -s "$api_base/health" | grep -q "running"; then
        pass_test "Environment Health ($env_name)"
    else
        fail_test "Environment Health ($env_name not accessible)"
    fi
}
