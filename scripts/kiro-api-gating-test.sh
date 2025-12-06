#!/bin/bash

echo "🧪 Kiro REST API Gating Test"
echo "============================="
echo ""

PASSED=0
FAILED=0

test_check() {
    if eval "$2" > /dev/null 2>&1; then
        echo "✓ $1"
        ((PASSED++))
    else
        echo "✗ $1"
        ((FAILED++))
    fi
}

echo "1. PR Processor API (Port 8082)"
test_check "Health endpoint responds" "curl -sf http://44.220.45.57:8082/health | jq -e '.status == \"ok\"'"
test_check "Has positive uptime" "curl -sf http://44.220.45.57:8082/health | jq -e '.uptime > 0'"
test_check "Accepts PR requests" "curl -s -X POST http://44.220.45.57:8082/api/process-pr -H 'Content-Type: application/json' -d '{\"branch\":\"test\",\"prNumber\":999,\"taskDescription\":\"test\"}' | jq -e '.status == \"accepted\"'"

echo ""
echo "2. Lambda Backend API"
test_check "Stories endpoint responds" "curl -sf https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories | jq -e 'length > 0'"
test_check "GITHUB_TOKEN configured" "aws lambda get-function-configuration --function-name aipm-backend-prod-api --region us-east-1 --query 'Environment.Variables.GITHUB_TOKEN' --output text | grep -q '^ghp_'"
test_check "EC2_PR_PROCESSOR_URL configured" "aws lambda get-function-configuration --function-name aipm-backend-prod-api --region us-east-1 --query 'Environment.Variables.EC2_PR_PROCESSOR_URL' --output text | grep -q '8082'"

echo ""
echo "3. End-to-End Integration"
echo "Testing full workflow: Lambda → GitHub PR Creation"
TIMESTAMP=$(date +%s)
TEST_RESPONSE=$(curl -s -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d "{
    \"repositoryApiUrl\": \"https://api.github.com\",
    \"owner\": \"demian7575\",
    \"repo\": \"aipm\",
    \"branchName\": \"gating-test-$TIMESTAMP\",
    \"taskTitle\": \"Gating Test $TIMESTAMP\",
    \"objective\": \"Verify Kiro API integration\",
    \"prTitle\": \"Gating Test $TIMESTAMP\",
    \"constraints\": \"None\",
    \"acceptanceCriteria\": \"Test passes\",
    \"target\": \"pr\"
  }")

PR_NUMBER=$(echo "$TEST_RESPONSE" | jq -r '.number')
test_check "Lambda creates PR via GitHub" "[ -n '$PR_NUMBER' ] && [ '$PR_NUMBER' != 'null' ]"

if [ -n "$PR_NUMBER" ] && [ "$PR_NUMBER" != "null" ]; then
    echo "  Created PR #$PR_NUMBER"
    echo "  Note: PR Processor will process this asynchronously"
fi

echo ""
echo "============================="
echo "📊 Results: $PASSED passed, $FAILED failed"
echo "============================="

if [ $FAILED -eq 0 ]; then
    echo "✅ ALL TESTS PASSED - System is stable"
    exit 0
else
    echo "❌ SOME TESTS FAILED - Review issues above"
    exit 1
fi
