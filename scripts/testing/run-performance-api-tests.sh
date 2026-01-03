#!/bin/bash
# Performance & API Contract Gating Tests
# Addresses high priority gaps for user experience and API safety

set -e

TESTS_PASSED=0
TESTS_FAILED=0
PROD_API_BASE="http://44.220.45.57"
DEV_API_BASE="http://44.222.168.46"
KIRO_API_BASE="http://44.220.45.57:8081"

log_test() {
    echo "  🧪 Testing: $1"
}

pass_test() {
    echo "    ✅ $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail_test() {
    echo "    ❌ $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
}

# Performance validation function
measure_response_time() {
    local url=$1
    local max_time=${2:-2000}  # Default 2 seconds
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" --max-time 10 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    echo "$response_time:$response"
}

# 1. Performance & Load Tests
test_performance_validation() {
    echo "⚡ Testing Performance & Load"
    
    # API response time validation
    log_test "API response times"
    
    # Test stories endpoint
    RESULT=$(measure_response_time "$PROD_API_BASE/api/stories" 2000)
    RESPONSE_TIME=$(echo "$RESULT" | cut -d: -f1)
    HTTP_CODE=$(echo "$RESULT" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" && "$RESPONSE_TIME" -lt 2000 ]]; then
        pass_test "Stories API responds in ${RESPONSE_TIME}ms (< 2s)"
    else
        fail_test "Stories API slow or failed: ${RESPONSE_TIME}ms, HTTP $HTTP_CODE"
    fi
    
    # Test health endpoint
    RESULT=$(measure_response_time "$PROD_API_BASE/health" 1000)
    RESPONSE_TIME=$(echo "$RESULT" | cut -d: -f1)
    HTTP_CODE=$(echo "$RESULT" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" && "$RESPONSE_TIME" -lt 1000 ]]; then
        pass_test "Health endpoint responds in ${RESPONSE_TIME}ms (< 1s)"
    else
        fail_test "Health endpoint slow or failed: ${RESPONSE_TIME}ms, HTTP $HTTP_CODE"
    fi
    
    # Concurrent request handling
    log_test "Concurrent request handling"
    
    # Launch 5 concurrent requests
    for i in {1..5}; do
        curl -s "$PROD_API_BASE/health" > /tmp/concurrent_$i.txt &
    done
    
    # Wait for all to complete
    wait
    
    # Check all succeeded
    SUCCESS_COUNT=0
    for i in {1..5}; do
        if grep -q "running" /tmp/concurrent_$i.txt 2>/dev/null; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        rm -f /tmp/concurrent_$i.txt
    done
    
    if [[ $SUCCESS_COUNT -eq 5 ]]; then
        pass_test "Handled 5 concurrent requests successfully"
    else
        fail_test "Only $SUCCESS_COUNT/5 concurrent requests succeeded"
    fi
    
    # Kiro API performance
    log_test "Kiro API performance"
    RESULT=$(measure_response_time "$KIRO_API_BASE/health" 3000)
    RESPONSE_TIME=$(echo "$RESULT" | cut -d: -f1)
    HTTP_CODE=$(echo "$RESULT" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" && "$RESPONSE_TIME" -lt 3000 ]]; then
        pass_test "Kiro API responds in ${RESPONSE_TIME}ms (< 3s)"
    else
        fail_test "Kiro API slow or failed: ${RESPONSE_TIME}ms, HTTP $HTTP_CODE"
    fi
}

# 2. API Contract & Versioning Tests
test_api_contract_validation() {
    echo "📋 Testing API Contract & Versioning"
    
    # API schema validation
    log_test "Stories API response schema"
    STORIES_RESPONSE=$(curl -s "$PROD_API_BASE/api/stories" 2>/dev/null || echo '[]')
    
    # Validate it's an array
    if echo "$STORIES_RESPONSE" | jq -e 'type == "array"' >/dev/null 2>&1; then
        pass_test "Stories API returns array"
    else
        fail_test "Stories API does not return array"
    fi
    
    # Validate story object structure (if stories exist)
    STORY_COUNT=$(echo "$STORIES_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
    if [[ "$STORY_COUNT" -gt 0 ]]; then
        # Check first story has required fields
        REQUIRED_FIELDS=("id" "title" "description" "status")
        MISSING_FIELDS=()
        
        for field in "${REQUIRED_FIELDS[@]}"; do
            if ! echo "$STORIES_RESPONSE" | jq -e ".[0] | has(\"$field\")" >/dev/null 2>&1; then
                MISSING_FIELDS+=("$field")
            fi
        done
        
        if [[ ${#MISSING_FIELDS[@]} -eq 0 ]]; then
            pass_test "Story objects have required fields"
        else
            fail_test "Story objects missing fields: ${MISSING_FIELDS[*]}"
        fi
    else
        pass_test "No stories to validate schema (empty database)"
    fi
    
    # API version consistency
    log_test "API version consistency"
    PROD_VERSION=$(curl -s "$PROD_API_BASE/api/version" 2>/dev/null | jq -r '.version // "unknown"')
    DEV_VERSION=$(curl -s "$DEV_API_BASE/api/version" 2>/dev/null | jq -r '.version // "unknown"')
    
    if [[ "$PROD_VERSION" != "unknown" && "$DEV_VERSION" != "unknown" ]]; then
        if [[ "$PROD_VERSION" == "$DEV_VERSION" ]]; then
            pass_test "API versions consistent (Prod: $PROD_VERSION, Dev: $DEV_VERSION)"
        else
            fail_test "API version mismatch (Prod: $PROD_VERSION, Dev: $DEV_VERSION)"
        fi
    else
        fail_test "API version endpoints not available"
    fi
    
    # HTTP method validation
    log_test "HTTP method support"
    
    # Test OPTIONS method (CORS preflight)
    OPTIONS_RESPONSE=$(curl -s -X OPTIONS "$PROD_API_BASE/api/stories" \
        -w "%{http_code}" -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$OPTIONS_RESPONSE" == "200" || "$OPTIONS_RESPONSE" == "204" ]]; then
        pass_test "OPTIONS method supported for CORS"
    else
        fail_test "OPTIONS method not supported: HTTP $OPTIONS_RESPONSE"
    fi
    
    # Error response format validation
    log_test "Error response format"
    ERROR_RESPONSE=$(curl -s "$PROD_API_BASE/api/nonexistent" 2>/dev/null || echo '{}')
    
    if echo "$ERROR_RESPONSE" | jq -e 'has("error") or has("message")' >/dev/null 2>&1; then
        pass_test "Error responses have proper format"
    else
        fail_test "Error responses lack proper format"
    fi
}

# 3. Resource Limits & Quotas Tests
test_resource_limits() {
    echo "📊 Testing Resource Limits & Quotas"
    
    # DynamoDB throttling protection
    log_test "DynamoDB throttling protection"
    
    # Test rapid requests (should not throttle with on-demand)
    THROTTLE_COUNT=0
    for i in {1..10}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$PROD_API_BASE/api/stories" 2>/dev/null || echo "000")
        if [[ "$RESPONSE" == "429" ]]; then
            THROTTLE_COUNT=$((THROTTLE_COUNT + 1))
        fi
        sleep 0.1
    done
    
    if [[ $THROTTLE_COUNT -eq 0 ]]; then
        pass_test "No DynamoDB throttling detected"
    else
        fail_test "DynamoDB throttling detected: $THROTTLE_COUNT/10 requests"
    fi
    
    # Request size limits
    log_test "Request size limits"
    
    # Test large payload (should be rejected gracefully)
    LARGE_PAYLOAD=$(printf '{"title":"Test","description":"%*s"}' 10000 "" | tr ' ' 'x')
    LARGE_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" \
        -H "Content-Type: application/json" \
        -d "$LARGE_PAYLOAD" \
        -w "%{http_code}" -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$LARGE_RESPONSE" == "413" || "$LARGE_RESPONSE" == "400" ]]; then
        pass_test "Large payloads rejected appropriately: HTTP $LARGE_RESPONSE"
    else
        fail_test "Large payloads not handled properly: HTTP $LARGE_RESPONSE"
    fi
    
    # Rate limiting validation
    log_test "Rate limiting protection"
    
    # Test rapid successive requests
    RATE_LIMIT_COUNT=0
    for i in {1..20}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$PROD_API_BASE/health" 2>/dev/null || echo "000")
        if [[ "$RESPONSE" == "429" ]]; then
            RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
        fi
    done
    
    # Rate limiting is optional, so we just report
    if [[ $RATE_LIMIT_COUNT -gt 0 ]]; then
        pass_test "Rate limiting active: $RATE_LIMIT_COUNT/20 requests limited"
    else
        pass_test "No rate limiting detected (acceptable for current scale)"
    fi
}

# Main execution
run_performance_api_tests() {
    echo "⚡ Performance & API Contract Gating Tests"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    test_performance_validation || true
    echo ""
    
    test_api_contract_validation || true
    echo ""
    
    test_resource_limits || true
    echo ""
    
    # Summary
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Performance & API Tests Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Tests Passed: $TESTS_PASSED"
    echo "❌ Tests Failed: $TESTS_FAILED"
    echo "📈 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo ""
        echo "🎉 All performance and API tests passed!"
        echo "✅ System meets performance and API contract requirements"
        exit 0
    else
        echo ""
        echo "⚠️  Performance or API tests failed"
        echo "❌ Address performance and API issues before deployment"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_performance_api_tests "$@"
fi
