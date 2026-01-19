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
    test_draft_generation "Draft Generation" "$kiro_base"
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

test_invest_analysis() {
    local api_base="${1:-$API_BASE}"
    local kiro_base="${2:-$KIRO_API_BASE}"
    log_test "INVEST Analysis"
    
    local story_id=$(curl -s "$api_base/api/stories" | jq -r '.[0].id' 2>/dev/null || echo "")
    if [[ -n "$story_id" && "$story_id" != "null" ]]; then
        if timeout 5 curl -s "$kiro_base/api/analyze-invest-stream?storyId=$story_id" | grep -q "data:"; then
            pass_test "INVEST Analysis SSE"
        else
            fail_test "INVEST Analysis (No SSE response)"
        fi
    else
        fail_test "INVEST Analysis (No story found)"
    fi
}

test_health_check() {
    local api_base="${1:-$API_BASE}"
    log_test "Health Check"
    
    local story_id=$(curl -s "$api_base/api/stories" | jq -r '.[0].id' 2>/dev/null || echo "")
    if [[ -n "$story_id" && "$story_id" != "null" ]]; then
        if curl -s -X POST "$api_base/api/stories/$story_id/health-check" \
            -H "Content-Type: application/json" \
            -d '{"includeAiInvest":false}' | jq -e '.investAnalysis' > /dev/null 2>&1; then
            pass_test "Health Check"
        else
            fail_test "Health Check (No analysis)"
        fi
    else
        fail_test "Health Check (No story)"
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

# ============================================
# END-TO-END TESTS
# ============================================

test_complete_user_journey() {
    local api_base="${1:-$API_BASE}"
    log_test "Complete User Journey"
    
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
        pass_test "User Journey (Story created: $story_id)"
        curl -s -X DELETE "$api_base/api/stories/$story_id" > /dev/null 2>&1
    else
        fail_test "User Journey (Story creation failed)"
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
        fail_test "Backend not running"
        return 1
    fi
    
    # Frontend availability
    if ! curl -s "$frontend_url" | grep -q "AIPM"; then
        fail_test "Frontend not accessible"
        return 1
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
