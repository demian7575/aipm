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

# Dynamically fetch API Gateway IDs from CloudFormation
PROD_API_ID=$(aws cloudformation describe-stacks \
    --stack-name aipm-backend-prod \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayRestApiId`].OutputValue' \
    --output text 2>/dev/null)

DEV_API_ID=$(aws cloudformation describe-stacks \
    --stack-name aipm-backend-dev \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayRestApiId`].OutputValue' \
    --output text 2>/dev/null)

# Define environments
declare -A ENVS
ENVS[prod]="${PROD_API_ID}.execute-api.us-east-1.amazonaws.com/prod|aipm-static-hosting-demo|aipm-backend-prod-api"
ENVS[dev]="${DEV_API_ID}.execute-api.us-east-1.amazonaws.com/dev|aipm-dev-frontend-hosting|aipm-backend-dev-api"

# Test 1: Frontend Config Points to Correct API
TEST_NUM=1
for env in prod dev; do
    IFS='|' read -r api_url s3_bucket lambda_name <<< "${ENVS[$env]}"
    
    echo "📋 Test $TEST_NUM: ${env^} Frontend Config"
    CONFIG=$(curl -s -m 5 "http://${s3_bucket}.s3-website-us-east-1.amazonaws.com/config.js")
    if echo "$CONFIG" | grep -q "$api_url"; then
        test_pass "${env^} config points to ${env} API"
    else
        test_fail "${env^} config NOT pointing to ${env} API"
        echo "      Current: $(echo "$CONFIG" | grep API_BASE_URL)"
    fi
    echo ""
    ((TEST_NUM++))
done

# Test 3: Lambda GITHUB_TOKEN Configuration
for env in prod dev; do
    IFS='|' read -r api_url s3_bucket lambda_name <<< "${ENVS[$env]}"
    
    echo "📋 Test $TEST_NUM: ${env^} Lambda GITHUB_TOKEN"
    TOKEN=$(aws lambda get-function-configuration \
        --function-name "$lambda_name" \
        --region us-east-1 \
        --query 'Environment.Variables.GITHUB_TOKEN' \
        --output text 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ] && [ "$TOKEN" != "" ]; then
        test_pass "${env^} Lambda has GITHUB_TOKEN configured"
    else
        test_fail "${env^} Lambda GITHUB_TOKEN is empty or missing"
    fi
    echo ""
    ((TEST_NUM++))
done

# Test 5: Production Lambda has EC2_PR_PROCESSOR_URL
echo "📋 Test $TEST_NUM: Production Lambda EC2_PR_PROCESSOR_URL"
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
echo ""
((TEST_NUM++))

# Test 6: SSM Parameter Store
echo "📋 Test $TEST_NUM: SSM Parameter Store"
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
echo ""
((TEST_NUM++))

# Test 7-8: Lambda Health Checks
for env in prod dev; do
    IFS='|' read -r api_url s3_bucket lambda_name <<< "${ENVS[$env]}"
    
    echo "📋 Test $TEST_NUM: ${env^} Lambda Health"
    HEALTH=$(curl -s -m 10 "https://${api_url}/api/stories" 2>&1)
    if echo "$HEALTH" | jq -e 'type == "array"' > /dev/null 2>&1; then
        test_pass "${env^} Lambda responding correctly"
    else
        test_fail "${env^} Lambda not responding or broken"
        echo "      Response: $(echo "$HEALTH" | head -c 100)"
    fi
    echo ""
    ((TEST_NUM++))
done

# Test 9: serverless.yml Configuration
echo "📋 Test $TEST_NUM: serverless.yml Configuration"
if grep -q 'GITHUB_TOKEN.*ssm:/aipm/github-token' serverless.yml; then
    test_pass "serverless.yml uses SSM for GITHUB_TOKEN"
else
    test_fail "serverless.yml NOT using SSM for GITHUB_TOKEN"
fi
echo ""
((TEST_NUM++))

# Test 10: EC2 Services Health
echo "📋 Test $TEST_NUM: EC2 Services Health"
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
