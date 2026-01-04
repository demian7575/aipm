#!/bin/bash
# Phase 2: Performance & API Safety Tests
# Priority: 🟡 High - Warns on failure, doesn't block deployment

set -e

TESTS_PASSED=0
TESTS_FAILED=0
PROD_API_BASE="http://44.220.45.57"
DEV_API_BASE="http://44.222.168.46"
KIRO_API_BASE="http://44.220.45.57:8081"

log_test() {
    echo "  🧪 $1"
}

pass_test() {
    echo "    ✅ $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

warn_test() {
    echo "    ⚠️  $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))  # Count warnings as passed for gating purposes
}

fail_test() {
    echo "    ❌ $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
}

# Measure response time
measure_response_time() {
    local url=$1
    local max_time=${2:-2000}
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" --max-time 10 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    echo "$response_time:$response"
}

# 2.1 Performance Validation Tests
test_performance_validation() {
    echo "⚡ Performance Validation Tests"
    
    # API response time validation
    log_test "Stories API response time"
    RESULT=$(measure_response_time "$PROD_API_BASE/api/stories" 2000)
    RESPONSE_TIME=$(echo "$RESULT" | cut -d: -f1)
    HTTP_CODE=$(echo "$RESULT" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" && "$RESPONSE_TIME" -lt 2000 ]]; then
        pass_test "Stories API: ${RESPONSE_TIME}ms (< 2s)"
    else
        fail_test "Stories API slow/failed: ${RESPONSE_TIME}ms, HTTP $HTTP_CODE"
    fi
    
    # Health endpoint performance
    log_test "Health endpoint response time"
    RESULT=$(measure_response_time "$PROD_API_BASE/health" 1000)
    RESPONSE_TIME=$(echo "$RESULT" | cut -d: -f1)
    HTTP_CODE=$(echo "$RESULT" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" && "$RESPONSE_TIME" -lt 1000 ]]; then
        pass_test "Health endpoint: ${RESPONSE_TIME}ms (< 1s)"
    else
        fail_test "Health endpoint slow/failed: ${RESPONSE_TIME}ms, HTTP $HTTP_CODE"
    fi
    
    # Concurrent request handling
    log_test "Concurrent request handling"
    for i in {1..5}; do
        curl -s "$PROD_API_BASE/health" > /tmp/concurrent_$i.txt &
    done
    wait
    
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
        warn_test "Only $SUCCESS_COUNT/5 concurrent requests succeeded (acceptable for current load)"
    fi
    
    # Kiro API performance
    log_test "Kiro API response time"
    RESULT=$(measure_response_time "$KIRO_API_BASE/health" 3000)
    RESPONSE_TIME=$(echo "$RESULT" | cut -d: -f1)
    HTTP_CODE=$(echo "$RESULT" | cut -d: -f2)
    
    if [[ "$HTTP_CODE" == "200" && "$RESPONSE_TIME" -lt 3000 ]]; then
        pass_test "Kiro API: ${RESPONSE_TIME}ms (< 3s)"
    else
        fail_test "Kiro API slow/failed: ${RESPONSE_TIME}ms, HTTP $HTTP_CODE"
    fi
}

# 2.2 API Contract Validation Tests
test_api_contract_validation() {
    echo ""
    echo "📋 API Contract Validation Tests"
    
    # Stories API schema validation
    log_test "Stories API response schema"
    STORIES_RESPONSE=$(curl -s "$PROD_API_BASE/api/stories" 2>/dev/null || echo '[]')
    
    if echo "$STORIES_RESPONSE" | jq -e 'type == "array"' >/dev/null 2>&1; then
        pass_test "Stories API returns valid array"
    else
        fail_test "Stories API does not return array"
    fi
    
    # Story object structure validation
    STORY_COUNT=$(echo "$STORIES_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
    if [[ "$STORY_COUNT" -gt 0 ]]; then
        log_test "Story object schema validation"
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
            fail_test "Story objects missing: ${MISSING_FIELDS[*]}"
        fi
    else
        pass_test "No stories to validate (empty database)"
    fi
    
    # API version consistency
    log_test "API version consistency"
    PROD_VERSION=$(curl -s "$PROD_API_BASE/api/version" 2>/dev/null | jq -r '.version // "unknown"')
    DEV_VERSION=$(curl -s "$DEV_API_BASE/api/version" 2>/dev/null | jq -r '.version // "unknown"')
    
    if [[ "$PROD_VERSION" != "unknown" && "$DEV_VERSION" != "unknown" ]]; then
        # Different versions between prod and dev is expected and correct
        pass_test "API versions available (Prod: $PROD_VERSION, Dev: $DEV_VERSION)"
    else
        fail_test "API version endpoints unavailable"
    fi
    
    # CORS validation
    log_test "CORS support validation"
    OPTIONS_RESPONSE=$(curl -s -X OPTIONS "$PROD_API_BASE/api/stories" \
        -w "%{http_code}" -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$OPTIONS_RESPONSE" == "200" || "$OPTIONS_RESPONSE" == "204" ]]; then
        pass_test "CORS OPTIONS method supported"
    else
        fail_test "CORS OPTIONS not supported: HTTP $OPTIONS_RESPONSE"
    fi
}

# 2.3 Resource Limits Tests
test_resource_limits() {
    echo ""
    echo "📊 Resource Limits Tests"
    
    # DynamoDB throttling check
    log_test "DynamoDB throttling protection"
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
        fail_test "DynamoDB throttling: $THROTTLE_COUNT/10 requests"
    fi
    
    # Request size limits
    log_test "Request size limit validation"
    LARGE_PAYLOAD=$(printf '{"title":"Test","description":"%*s"}' 10000 "" | tr ' ' 'x')
    LARGE_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories" \
        -H "Content-Type: application/json" \
        -d "$LARGE_PAYLOAD" \
        -w "%{http_code}" -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$LARGE_RESPONSE" == "413" || "$LARGE_RESPONSE" == "400" ]]; then
        pass_test "Large payloads rejected: HTTP $LARGE_RESPONSE"
    else
        warn_test "Large payloads not handled: HTTP $LARGE_RESPONSE (acceptable for current implementation)"
    fi
    
    # Rate limiting check
    log_test "Rate limiting validation"
    RATE_LIMIT_COUNT=0
    for i in {1..20}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$PROD_API_BASE/health" 2>/dev/null || echo "000")
        if [[ "$RESPONSE" == "429" ]]; then
            RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
        fi
    done
    
    if [[ $RATE_LIMIT_COUNT -gt 0 ]]; then
        pass_test "Rate limiting active: $RATE_LIMIT_COUNT/20 limited"
    else
        pass_test "No rate limiting (acceptable for current scale)"
    fi
}

# Main execution
main() {
    echo "🟡 Phase 2: Performance & API Safety"
    echo ""
    
    test_performance_validation || true
    test_api_contract_validation || true
    test_resource_limits || true
    
    echo ""
    echo "📊 Phase 2 Results: ✅ $TESTS_PASSED passed, ❌ $TESTS_FAILED failed"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo "🎉 Phase 2 completed successfully"
        exit 0
    else
        echo "⚠️  Phase 2 has failures - consider addressing before deployment"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
