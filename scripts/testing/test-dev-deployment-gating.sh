#!/bin/bash

echo "🧪 Test in Dev Deployment - Gating Tests"
echo "=========================================="
echo ""

FAILED=0
PASSED=0

# Test 1: Dev API Endpoint
echo "Test 1: Dev API Health Check"
DEV_API="https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"
API_RESPONSE=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "$DEV_API/api/stories" 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "200" ]; then
  echo "  ✅ PASS - API responding (HTTP 200)"
  ((PASSED++))
else
  echo "  ❌ FAIL - API not responding (HTTP $API_RESPONSE)"
  ((FAILED++))
fi
echo ""

# Test 2: Dev Frontend
echo "Test 2: Dev Frontend Health Check"
FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"
FRONTEND_RESPONSE=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
  echo "  ✅ PASS - Frontend accessible (HTTP 200)"
  ((PASSED++))
else
  echo "  ❌ FAIL - Frontend not accessible (HTTP $FRONTEND_RESPONSE)"
  ((FAILED++))
fi
echo ""

# Test 3: Config.js Deployment
echo "Test 3: Config.js Deployment"
CONFIG_RESPONSE=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/config.js" 2>/dev/null || echo "000")
if [ "$CONFIG_RESPONSE" = "200" ]; then
  echo "  ✅ PASS - Config.js deployed"
  ((PASSED++))
else
  echo "  ❌ FAIL - Config.js missing (HTTP $CONFIG_RESPONSE)"
  ((FAILED++))
fi
echo ""

# Test 4: Config Points to Dev API
echo "Test 4: Config Points to Dev API"
CONFIG_CONTENT=$(timeout 10 curl -s "$FRONTEND_URL/config.js" 2>/dev/null || echo "")
if echo "$CONFIG_CONTENT" | grep -q "dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"; then
  echo "  ✅ PASS - Config points to dev API"
  ((PASSED++))
else
  echo "  ❌ FAIL - Config doesn't point to dev API"
  ((FAILED++))
fi
echo ""

# Test 5: Dev DynamoDB Tables Exist
echo "Test 5: Dev DynamoDB Tables"
if timeout 10 aws dynamodb describe-table --table-name aipm-backend-dev-stories --region us-east-1 >/dev/null 2>&1; then
  echo "  ✅ PASS - Stories table exists"
  ((PASSED++))
else
  echo "  ❌ FAIL - Stories table missing"
  ((FAILED++))
fi

if timeout 10 aws dynamodb describe-table --table-name aipm-backend-dev-acceptance-tests --region us-east-1 >/dev/null 2>&1; then
  echo "  ✅ PASS - Acceptance tests table exists"
  ((PASSED++))
else
  echo "  ❌ FAIL - Acceptance tests table missing"
  ((FAILED++))
fi
echo ""

# Test 6: GitHub Actions Workflow Exists
echo "Test 6: GitHub Actions Workflow"
if [ -f ".github/workflows/deploy-pr-to-dev.yml" ]; then
  echo "  ✅ PASS - Workflow file exists"
  ((PASSED++))
else
  echo "  ❌ FAIL - Workflow file missing"
  ((FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "Test Results:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
  echo "❌ GATING TESTS FAILED"
  exit 1
else
  echo "✅ ALL GATING TESTS PASSED"
  exit 0
fi
