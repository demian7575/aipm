#!/bin/bash
# Deployment Configuration Gating Tests
# Prevents common configuration errors that break production

PASSED=0
FAILED=0

echo "🔍 Deployment Configuration Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_pass() {
    echo "   ✅ $1"
    ((PASSED++))
}

test_fail() {
    echo "   ❌ $1"
    ((FAILED++))
}

# Test 1: Production config.js points to prod API
echo "📋 Test 1: Production Frontend Config"
PROD_CONFIG=$(curl -s -m 5 http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/config.js)
if echo "$PROD_CONFIG" | grep -q "wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"; then
    test_pass "Production config points to prod API"
else
    test_fail "Production config NOT pointing to prod API"
    echo "      Current: $(echo "$PROD_CONFIG" | grep API_BASE_URL)"
fi

# Test 2: Dev config.js points to dev API (skip if dev doesn't exist)
echo ""
echo "📋 Test 2: Development Frontend Config"
if aws cloudformation describe-stacks --stack-name aipm-dev --region us-east-1 >/dev/null 2>&1; then
    DEV_CONFIG=$(curl -s -m 5 http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/config.js)
    if echo "$DEV_CONFIG" | grep -q "dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"; then
        test_pass "Development config points to dev API"
    else
        test_fail "Development config NOT pointing to dev API"
        echo "      Current: $(echo "$DEV_CONFIG" | grep API_BASE_URL)"
    fi
else
    echo "   ⏭️  Skipped (dev environment not deployed)"
fi

# Test 3: Production Lambda has GITHUB_TOKEN
echo ""
echo "📋 Test 3: Production Lambda GITHUB_TOKEN"
PROD_TOKEN=$(aws lambda get-function-configuration \
    --function-name aipm-backend-prod-api \
    --region us-east-1 \
    --query 'Environment.Variables.GITHUB_TOKEN' \
    --output text 2>/dev/null)
if [ -n "$PROD_TOKEN" ] && [ "$PROD_TOKEN" != "None" ] && [ "$PROD_TOKEN" != "" ]; then
    test_pass "Production Lambda has GITHUB_TOKEN configured"
else
    test_fail "Production Lambda GITHUB_TOKEN is empty or missing"
fi

# Test 4: Dev Lambda has GITHUB_TOKEN (skip if dev doesn't exist)
echo ""
echo "📋 Test 4: Development Lambda GITHUB_TOKEN"
if aws lambda get-function-configuration --function-name aipm-backend-dev-api --region us-east-1 >/dev/null 2>&1; then
    DEV_TOKEN=$(aws lambda get-function-configuration \
        --function-name aipm-backend-dev-api \
        --region us-east-1 \
        --query 'Environment.Variables.GITHUB_TOKEN' \
        --output text 2>/dev/null)
    if [ -n "$DEV_TOKEN" ] && [ "$DEV_TOKEN" != "None" ] && [ "$DEV_TOKEN" != "" ]; then
        test_pass "Development Lambda has GITHUB_TOKEN configured"
    else
        test_fail "Development Lambda GITHUB_TOKEN is empty or missing"
    fi
else
    echo "   ⏭️  Skipped (dev Lambda not deployed)"
fi

# Test 5: Production Lambda has EC2_PR_PROCESSOR_URL
echo ""
echo "📋 Test 5: Production Lambda EC2_PR_PROCESSOR_URL"
PROD_PROCESSOR=$(aws lambda get-function-configuration \
    --function-name aipm-backend-prod-api \
    --region us-east-1 \
    --query 'Environment.Variables.EC2_PR_PROCESSOR_URL' \
    --output text 2>/dev/null)
if [ -n "$PROD_PROCESSOR" ] && [ "$PROD_PROCESSOR" != "None" ]; then
    test_pass "Production Lambda has EC2_PR_PROCESSOR_URL: $PROD_PROCESSOR"
else
    test_fail "Production Lambda EC2_PR_PROCESSOR_URL is missing"
fi

# Test 6: SSM Parameter exists for GITHUB_TOKEN
echo ""
echo "📋 Test 6: SSM Parameter Store"
SSM_TOKEN=$(aws ssm get-parameter \
    --name "/aipm/github-token" \
    --region us-east-1 \
    --query 'Parameter.Value' \
    --output text 2>/dev/null)
if [ -n "$SSM_TOKEN" ] && [ "$SSM_TOKEN" != "None" ]; then
    test_pass "SSM Parameter /aipm/github-token exists"
else
    test_fail "SSM Parameter /aipm/github-token is missing"
fi

# Test 7: Production Lambda is not broken
echo ""
echo "📋 Test 7: Production Lambda Health"
PROD_HEALTH=$(curl -s -m 10 https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories 2>&1)
if echo "$PROD_HEALTH" | jq -e 'type == "array"' > /dev/null 2>&1; then
    test_pass "Production Lambda responding correctly"
else
    test_fail "Production Lambda not responding or broken"
    echo "      Response: $(echo "$PROD_HEALTH" | head -c 100)"
fi

# Test 8: Dev Lambda is not broken (skip if dev doesn't exist)
echo ""
echo "📋 Test 8: Development Lambda Health"
if aws lambda get-function-configuration --function-name aipm-backend-dev-api --region us-east-1 >/dev/null 2>&1; then
    DEV_HEALTH=$(curl -s -m 10 https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev/api/stories 2>&1)
    if echo "$DEV_HEALTH" | jq -e 'type == "array"' > /dev/null 2>&1; then
        test_pass "Development Lambda responding correctly"
    else
        test_fail "Development Lambda not responding or broken"
        echo "      Response: $(echo "$DEV_HEALTH" | head -c 100)"
    fi
else
    echo "   ⏭️  Skipped (dev Lambda not deployed)"
fi

# Test 9: serverless.yml uses SSM for GITHUB_TOKEN
echo ""
echo "📋 Test 9: serverless.yml Configuration"
if grep -q 'GITHUB_TOKEN.*ssm:/aipm/github-token' serverless.yml; then
    test_pass "serverless.yml uses SSM for GITHUB_TOKEN"
else
    test_fail "serverless.yml NOT using SSM for GITHUB_TOKEN"
fi

# Test 10: EC2 services are running
echo ""
echo "📋 Test 10: EC2 Services Health"
KIRO_API=$(curl -s -m 5 http://44.220.45.57:8081/health 2>&1 | jq -r '.status' 2>/dev/null)
PR_PROCESSOR=$(curl -s -m 5 http://44.220.45.57:8082/health 2>&1 | jq -r '.status' 2>/dev/null)
TERMINAL=$(curl -s -m 5 http://44.220.45.57:8080/health 2>&1 | jq -r '.status' 2>/dev/null)

if [ "$KIRO_API" = "running" ]; then
    test_pass "Kiro API (8081) is running"
else
    test_fail "Kiro API (8081) is NOT running"
fi

if [ "$PR_PROCESSOR" = "ok" ]; then
    test_pass "PR Processor (8082) is running"
else
    test_fail "PR Processor (8082) is NOT running"
fi

if [ "$TERMINAL" = "running" ]; then
    test_pass "Terminal Server (8080) is running"
else
    test_fail "Terminal Server (8080) is NOT running"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASSED passed, $FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -gt 0 ]; then
    echo "❌ Deployment configuration has issues"
    exit 1
else
    echo "✅ All deployment configuration checks passed"
    exit 0
fi
