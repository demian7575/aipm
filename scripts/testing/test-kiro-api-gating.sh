#!/bin/bash
# Kiro API Gating Tests - Functional Requirements Validation

KIRO_API_URL="${KIRO_API_URL:-http://44.220.45.57:8081}"
PASSED=0
FAILED=0

echo "🧪 Kiro API Gating Tests"
echo "API: $KIRO_API_URL"
echo ""

# Test helper functions
test_pass() {
    echo "   ✅ $1"
    ((PASSED++))
}

test_fail() {
    echo "   ❌ $1"
    ((FAILED++))
}

# FR-2.1: Health endpoint returns status
echo "📋 FR-2.1: Health Endpoint Returns Status"
RESPONSE=$(curl -s -w "\n%{http_code}" "$KIRO_API_URL/health" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q '"status".*"running"'; then
        test_pass "Health check returns 200 with running status"
    else
        test_fail "Health check missing 'running' status"
    fi
else
    test_fail "Health check returned $HTTP_CODE instead of 200"
fi

# FR-2.1: Health endpoint includes required fields
echo ""
echo "📋 FR-2.1: Health Endpoint Includes Required Fields"
if echo "$BODY" | grep -q '"activeRequests"'; then
    test_pass "Health includes activeRequests"
else
    test_fail "Health missing activeRequests"
fi

if echo "$BODY" | grep -q '"queuedRequests"'; then
    test_pass "Health includes queuedRequests"
else
    test_fail "Health missing queuedRequests"
fi

if echo "$BODY" | grep -q '"maxConcurrent"'; then
    test_pass "Health includes maxConcurrent"
else
    test_fail "Health missing maxConcurrent"
fi

if echo "$BODY" | grep -q '"uptime"'; then
    test_pass "Health includes uptime"
else
    test_fail "Health missing uptime"
fi

# FR-1.2: Reject missing prompt
echo ""
echo "📋 FR-1.2: Reject Missing Prompt"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$KIRO_API_URL/execute" \
    -H "Content-Type: application/json" \
    -d '{"context":"test"}' 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "400" ]; then
    if echo "$BODY" | grep -q "prompt required"; then
        test_pass "Rejects request without prompt (400)"
    else
        test_fail "Returns 400 but wrong error message"
    fi
else
    test_fail "Should return 400 for missing prompt, got $HTTP_CODE"
fi

# FR-4.1: Handle OPTIONS request (CORS)
echo ""
echo "📋 FR-4.1: Handle OPTIONS Request (CORS)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS "$KIRO_API_URL/execute" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "204" ]; then
    test_pass "OPTIONS request returns 204"
else
    test_fail "OPTIONS request returned $HTTP_CODE instead of 204"
fi

# FR-4.2: CORS headers present
echo ""
echo "📋 FR-4.2: CORS Headers Present"
HEADERS=$(curl -s -I "$KIRO_API_URL/health" 2>/dev/null)

if echo "$HEADERS" | grep -qi "Access-Control-Allow-Origin"; then
    test_pass "CORS headers present"
else
    test_fail "CORS headers missing"
fi

# FR-1.1: Accept valid request (simple test - don't wait for completion)
echo ""
echo "📋 FR-1.1: Accept Valid Request"
RESPONSE=$(timeout 30 curl -s -w "\n%{http_code}" -X POST "$KIRO_API_URL/execute" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"echo test","timeoutMs":5000}' 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Accepts valid request (200)"
else
    test_fail "Valid request returned $HTTP_CODE instead of 200"
fi

# FR-5.1: Handle invalid JSON
echo ""
echo "📋 FR-5.1: Handle Invalid JSON"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$KIRO_API_URL/execute" \
    -H "Content-Type: application/json" \
    -d '{invalid json}' 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "400" ]; then
    test_pass "Handles invalid JSON with error response"
else
    test_fail "Invalid JSON returned $HTTP_CODE"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Kiro API Gating Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED"
    exit 0
else
    echo "⚠️  SOME TESTS FAILED"
    exit 1
fi
