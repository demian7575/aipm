#!/bin/bash

# Kiro REST API Health Check Script
# Verifies all components are working correctly

set -e

echo "🔍 Kiro REST API Health Check"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Component URLs
WORKER_POOL_URL="http://44.220.45.57:8081"
PR_PROCESSOR_URL="http://44.220.45.57:8082"
LAMBDA_URL="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"

# Test results
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
        ((FAILED++))
        return 1
    fi
}

# Helper function to test JSON response
test_json_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" 2>&1)
    
    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Response: $(echo "$response" | jq -c .)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Response: $response"
        ((FAILED++))
        return 1
    fi
}

echo "1️⃣  Worker Pool API (Port 8081)"
echo "--------------------------------"
test_json_endpoint "Health Check" "$WORKER_POOL_URL/health" "status"
test_json_endpoint "Worker Status" "$WORKER_POOL_URL/health" "workers"
echo ""

echo "2️⃣  PR Processor API (Port 8082)"
echo "--------------------------------"
test_json_endpoint "Health Check" "$PR_PROCESSOR_URL/health" "status"
echo ""

echo "3️⃣  Lambda Backend API"
echo "--------------------------------"
test_endpoint "API Gateway" "$LAMBDA_URL/api/stories"
echo ""

echo "4️⃣  Environment Variables"
echo "--------------------------------"
echo -n "Checking Lambda GITHUB_TOKEN... "
TOKEN=$(aws lambda get-function-configuration --function-name aipm-backend-prod-api --region us-east-1 --query 'Environment.Variables.GITHUB_TOKEN' --output text 2>&1)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
    echo -e "${GREEN}✓ PASS${NC} (configured)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (not configured)"
    ((FAILED++))
fi

echo -n "Checking Lambda EC2_PR_PROCESSOR_URL... "
PR_URL=$(aws lambda get-function-configuration --function-name aipm-backend-prod-api --region us-east-1 --query 'Environment.Variables.EC2_PR_PROCESSOR_URL' --output text 2>&1)
if [ "$PR_URL" = "$PR_PROCESSOR_URL" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($PR_URL)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (expected $PR_PROCESSOR_URL, got $PR_URL)"
    ((FAILED++))
fi
echo ""

echo "5️⃣  Worker Pool Detailed Status"
echo "--------------------------------"
WORKER_STATUS=$(curl -s "$WORKER_POOL_URL/health")
echo "Workers: $(echo "$WORKER_STATUS" | jq -r '.workers | length') total"
echo "Active Requests: $(echo "$WORKER_STATUS" | jq -r '.activeRequests')"
echo "Queued Requests: $(echo "$WORKER_STATUS" | jq -r '.queuedRequests')"
echo "Uptime: $(echo "$WORKER_STATUS" | jq -r '.uptime') seconds"

WORKER_1_READY=$(echo "$WORKER_STATUS" | jq -r '.workers[0].ready')
WORKER_2_READY=$(echo "$WORKER_STATUS" | jq -r '.workers[1].ready')

echo -n "Worker 1 Ready: "
if [ "$WORKER_1_READY" = "true" ]; then
    echo -e "${GREEN}✓ YES${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ NO${NC}"
    ((FAILED++))
fi

echo -n "Worker 2 Ready: "
if [ "$WORKER_2_READY" = "true" ]; then
    echo -e "${GREEN}✓ YES${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ NO${NC}"
    ((FAILED++))
fi
echo ""

echo "6️⃣  Integration Test (Optional)"
echo "--------------------------------"
echo -e "${YELLOW}To test full workflow:${NC}"
echo "1. Go to AIPM UI: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "2. Click 'Generate Code & PR' on a user story"
echo "3. Check Lambda logs: aws logs tail /aws/lambda/aipm-backend-prod-api --since 1m --region us-east-1 --follow"
echo "4. Check PR Processor logs: ssh ec2-user@44.220.45.57 'tail -f /tmp/pr-processor.log'"
echo ""

echo "=============================="
echo "📊 Summary"
echo "=============================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
    exit 1
fi
