#!/bin/bash
# AIPM Gating Tests - Essential validation only

set -e

# Configuration
PROD_API="http://44.220.45.57"
DEV_API="http://44.222.168.46"
PROD_KIRO="http://44.220.45.57:8081"
DEV_KIRO="http://44.222.168.46:8081"
PROD_FRONTEND="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
DEV_FRONTEND="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    if curl -s -m 10 "$url" | grep -q "$expected"; then
        echo "✅ $name"
        PASSED=$((PASSED + 1))
    else
        echo "❌ $name"
        FAILED=$((FAILED + 1))
    fi
}

test_api_endpoint() {
    local name=$1
    local url=$2
    
    if curl -s -m 10 "$url" | jq -e . > /dev/null 2>&1; then
        echo "✅ $name"
        PASSED=$((PASSED + 1))
    else
        echo "❌ $name"
        FAILED=$((FAILED + 1))
    fi
}

echo "🧪 AIPM Essential Gating Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Production Tests
echo "📋 Production Environment"
test_api_endpoint "Production API Health" "$PROD_API/api/stories"
test_endpoint "Production Kiro API" "$PROD_KIRO/health" "running"
test_endpoint "Production Frontend" "$PROD_FRONTEND" "html"

# Development Tests  
echo "📋 Development Environment"
test_api_endpoint "Development API Health" "$DEV_API/api/stories"
test_endpoint "Development Kiro API" "$DEV_KIRO/health" "running"
test_endpoint "Development Frontend" "$DEV_FRONTEND" "html"

# Draft Generation Tests
echo "📋 Draft Generation"
if curl -s -X POST "$PROD_KIRO/api/generate-draft" \
    -H "Content-Type: application/json" \
    -d '{"templateId": "user-story-generation", "feature_description": "test", "parentId": "1"}' \
    | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Production Draft Generation"
    PASSED=$((PASSED + 1))
else
    echo "❌ Production Draft Generation"
    FAILED=$((FAILED + 1))
fi

if curl -s -X POST "$DEV_KIRO/api/generate-draft" \
    -H "Content-Type: application/json" \
    -d '{"templateId": "user-story-generation", "feature_description": "test", "parentId": "1"}' \
    | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Development Draft Generation"
    PASSED=$((PASSED + 1))
else
    echo "❌ Development Draft Generation"
    FAILED=$((FAILED + 1))
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: ✅ $PASSED passed, ❌ $FAILED failed"

if [ $FAILED -eq 0 ]; then
    echo "🎉 All gating tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed"
    exit 1
fi
