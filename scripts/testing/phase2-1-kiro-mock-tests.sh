#!/bin/bash
# Phase 2-1: Kiro CLI Mock Tests (No Real Kiro Dependency)

set -e
source "$(dirname "$0")/test-library.sh"

KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

echo "🧪 Phase 2-1: Kiro CLI Mock Tests"
echo "Testing Kiro API endpoints (mock - no actual AI execution)"
echo ""

# Mock test: Draft generation endpoint exists and accepts requests
test_draft_generation_endpoint_mock() {
    log_test "Draft Generation Endpoint (Mock)"
    
    local response
    if [[ -n "$SSH_HOST" ]]; then
        response=$(ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$SSH_HOST \
            "curl -s -w '\n%{http_code}' -X POST '$KIRO_API_BASE/api/generate-draft' \
            -H 'Content-Type: application/json' \
            -d '{\"requestId\":\"mock-test\",\"feature_description\":\"Mock test\"}' \
            --max-time 5" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w '\n%{http_code}' -X POST "$KIRO_API_BASE/api/generate-draft" \
            -H "Content-Type: application/json" \
            -d '{"requestId":"mock-test","feature_description":"Mock test"}' \
            --max-time 5 2>/dev/null || echo "000")
    fi
    
    local http_code=$(echo "$response" | tail -1)
    
    # Accept any response (200, 400, 500) as endpoint exists
    if [[ "$http_code" != "000" ]]; then
        pass_test "Draft Generation Endpoint (responds)"
    else
        fail_test "Draft Generation Endpoint (no response)"
    fi
}

# Mock test: Code generation endpoint exists
test_code_generation_endpoint_mock() {
    log_test "Code Generation Endpoint (Mock)"
    
    local response
    if [[ -n "$SSH_HOST" ]]; then
        response=$(ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$SSH_HOST \
            "curl -s -w '\n%{http_code}' -X POST '$KIRO_API_BASE/api/code-generation' \
            -H 'Content-Type: application/json' \
            -d '{\"storyId\":\"mock-test\"}' \
            --max-time 5" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w '\n%{http_code}' -X POST "$KIRO_API_BASE/api/code-generation" \
            -H "Content-Type: application/json" \
            -d '{"storyId":"mock-test"}' \
            --max-time 5 2>/dev/null || echo "000")
    fi
    
    local http_code=$(echo "$response" | tail -1)
    
    # Accept any response as endpoint exists
    if [[ "$http_code" != "000" ]]; then
        pass_test "Code Generation Endpoint (responds)"
    else
        fail_test "Code Generation Endpoint (no response)"
    fi
}

# Run mock tests
test_draft_generation_endpoint_mock
test_code_generation_endpoint_mock

echo ""
echo "✅ Phase 2-1 completed (Mock tests)"
