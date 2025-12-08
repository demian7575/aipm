#!/bin/bash
# Code Generation Workflow Gating Tests
# Tests each step of the "Generate Code & PR" workflow

set -e

PASSED=0
FAILED=0
WARNINGS=0

echo "🧪 Code Generation Workflow Gating Tests"
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

test_warn() {
    echo "   ⚠️  $1"
    ((WARNINGS++))
}

# Test 1: Lambda can create PRs
echo "📋 Test 1: Lambda PR Creation Endpoint"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/health \
    -H "Content-Type: application/json" \
    --max-time 10)
if [ "$RESPONSE" = "200" ]; then
    test_pass "Lambda is responding"
else
    test_fail "Lambda not responding (HTTP $RESPONSE)"
fi
echo ""

# Test 2: PR Processor is running
echo "📋 Test 2: PR Processor Service"
PR_PROC_HEALTH=$(curl -s http://44.220.45.57:8082/health 2>&1 | jq -r '.status' 2>/dev/null)
if [ "$PR_PROC_HEALTH" = "ok" ]; then
    test_pass "PR Processor is running"
else
    test_fail "PR Processor not responding"
fi
echo ""

# Test 3: Worker Pool is running
echo "📋 Test 3: Worker Pool Service"
WORKER_HEALTH=$(curl -s http://44.220.45.57:8080/health 2>&1 | jq -r '.status' 2>/dev/null)
if [ "$WORKER_HEALTH" = "running" ]; then
    test_pass "Worker Pool is running"
    
    # Check worker status
    WORKER1_STATUS=$(curl -s http://44.220.45.57:8080/health | jq -r '.workers.worker1.status')
    WORKER2_STATUS=$(curl -s http://44.220.45.57:8080/health | jq -r '.workers.worker2.status')
    
    if [ "$WORKER1_STATUS" = "idle" ] && [ "$WORKER2_STATUS" = "idle" ]; then
        test_pass "Both workers are idle and ready"
    else
        test_warn "Workers status: worker1=$WORKER1_STATUS, worker2=$WORKER2_STATUS"
    fi
else
    test_fail "Worker Pool not responding"
fi
echo ""

# Test 4: Kiro API is running
echo "📋 Test 4: Kiro API Service"
KIRO_HEALTH=$(curl -s http://44.220.45.57:8081/health 2>&1 | jq -r '.status' 2>/dev/null)
if [ "$KIRO_HEALTH" = "running" ]; then
    test_pass "Kiro API is running"
else
    test_fail "Kiro API not responding"
fi
echo ""

# Test 5: Git configuration
echo "📋 Test 5: Git Configuration on EC2"
GIT_EDITOR=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "cd ~/aipm && git config core.editor" 2>/dev/null)
if [ "$GIT_EDITOR" = "true" ]; then
    test_pass "Git editor set to non-interactive"
else
    test_fail "Git editor not configured correctly (current: $GIT_EDITOR)"
fi
echo ""

# Test 6: No stuck git operations
echo "📋 Test 6: Git Repository State"
REBASE_DIR=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "[ -d ~/aipm/.git/rebase-merge ] && echo 'exists' || echo 'clean'" 2>/dev/null)
MERGE_HEAD=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "[ -f ~/aipm/.git/MERGE_HEAD ] && echo 'exists' || echo 'clean'" 2>/dev/null)

if [ "$REBASE_DIR" = "clean" ] && [ "$MERGE_HEAD" = "clean" ]; then
    test_pass "No stuck git operations"
else
    test_warn "Stuck git operations detected (rebase: $REBASE_DIR, merge: $MERGE_HEAD)"
fi
echo ""

# Test 7: GitHub token configured
echo "📋 Test 7: GitHub Token Configuration"
GITHUB_TOKEN=$(aws lambda get-function-configuration \
    --function-name aipm-backend-prod-api \
    --region us-east-1 \
    --query 'Environment.Variables.GITHUB_TOKEN' \
    --output text 2>/dev/null)
if [ -n "$GITHUB_TOKEN" ] && [ "$GITHUB_TOKEN" != "None" ]; then
    test_pass "GitHub token configured in Lambda"
else
    test_fail "GitHub token not configured"
fi
echo ""

# Test 8: EC2 PR Processor URL configured
echo "📋 Test 8: EC2 PR Processor URL"
EC2_URL=$(aws lambda get-function-configuration \
    --function-name aipm-backend-prod-api \
    --region us-east-1 \
    --query 'Environment.Variables.EC2_PR_PROCESSOR_URL' \
    --output text 2>/dev/null)
if [ "$EC2_URL" = "http://44.220.45.57:8082" ]; then
    test_pass "EC2 PR Processor URL configured correctly"
else
    test_warn "EC2 PR Processor URL: $EC2_URL"
fi
echo ""

# Test 9: Health check timer
echo "📋 Test 9: Git Health Check Timer"
TIMER_STATUS=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "systemctl is-active git-health-check.timer" 2>/dev/null)
if [ "$TIMER_STATUS" = "active" ]; then
    test_pass "Git health check timer is active"
else
    test_warn "Git health check timer not active"
fi
echo ""

# Test 10: Recent PR processor logs
echo "📋 Test 10: PR Processor Logs"
RECENT_LOGS=$(ssh -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "journalctl -u pr-processor -n 5 --no-pager 2>/dev/null | wc -l")
if [ "$RECENT_LOGS" -gt 0 ]; then
    test_pass "PR Processor is logging"
else
    test_warn "No recent PR Processor logs"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASSED passed, $FAILED failed, $WARNINGS warnings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -gt 0 ]; then
    echo "❌ Code generation workflow has critical issues"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Code generation workflow has warnings but is functional"
    exit 0
else
    echo "✅ Code generation workflow is healthy"
    exit 0
fi
