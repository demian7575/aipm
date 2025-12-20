#!/bin/bash
# Pre-deployment Gating Tests - Prevent Common Deployment Errors

set -e

PASSED=0
FAILED=0
EC2_HOST="${EC2_HOST:-44.220.45.57}"

echo "🔍 Pre-Deployment Validation"
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

# Test 1: Port 8081 accessible
echo "📋 Test 1: Kiro API Port Accessible"
if curl -s -m 5 http://${EC2_HOST}:8081/health > /dev/null 2>&1; then
    test_pass "Port 8081 is accessible"
else
    test_fail "Port 8081 is NOT accessible - check security group"
fi

# Test 2: EC2 on correct branch
echo ""
echo "📋 Test 2: EC2 Repository State"
BRANCH=$(ssh ec2-user@${EC2_HOST} "cd ~/aipm && git branch --show-current" 2>/dev/null || echo "ERROR")
if [ "$BRANCH" = "develop" ]; then
    test_pass "EC2 on develop branch"
else
    test_fail "EC2 on wrong branch: $BRANCH (should be develop)"
fi

# Test 3: EC2 no uncommitted changes
echo ""
echo "📋 Test 3: EC2 Working Directory Clean"
CHANGES=$(ssh ec2-user@${EC2_HOST} "cd ~/aipm && git status --porcelain" 2>/dev/null | wc -l)
if [ "$CHANGES" -eq 0 ]; then
    test_pass "No uncommitted changes on EC2"
else
    test_fail "EC2 has $CHANGES uncommitted changes - stash or commit first"
fi

# Test 4: EC2 up to date with origin
echo ""
echo "📋 Test 4: EC2 Repository Up to Date"
ssh ec2-user@${EC2_HOST} "cd ~/aipm && git fetch origin develop" > /dev/null 2>&1
BEHIND=$(ssh ec2-user@${EC2_HOST} "cd ~/aipm && git rev-list HEAD..origin/develop --count" 2>/dev/null || echo "999")
if [ "$BEHIND" -eq 0 ]; then
    test_pass "EC2 is up to date with origin/develop"
else
    test_fail "EC2 is $BEHIND commits behind origin/develop"
fi

# Test 5: Kiro API service running
echo ""
echo "📋 Test 5: Kiro API Service Status"
if ssh ec2-user@${EC2_HOST} "sudo systemctl is-active --quiet kiro-api-server" 2>/dev/null; then
    test_pass "Kiro API service is running"
else
    test_fail "Kiro API service is NOT running"
fi

# Test 6: Kiro CLI available
echo ""
echo "📋 Test 6: Kiro CLI Installed"
if ssh ec2-user@${EC2_HOST} "which kiro-cli" > /dev/null 2>&1; then
    test_pass "Kiro CLI is installed"
else
    test_fail "Kiro CLI is NOT installed"
fi

# Test 7: AWS credentials configured
echo ""
echo "📋 Test 7: AWS Credentials"
if aws sts get-caller-identity > /dev/null 2>&1; then
    test_pass "AWS credentials configured"
else
    test_fail "AWS credentials NOT configured"
fi

# Test 8: Serverless framework available
echo ""
echo "📋 Test 8: Serverless Framework"
if command -v serverless > /dev/null 2>&1 || npx serverless --version > /dev/null 2>&1; then
    test_pass "Serverless framework available"
else
    test_fail "Serverless framework NOT available"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Pre-Deployment Validation Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL PREREQUISITES MET - Safe to deploy"
    exit 0
else
    echo "⚠️  FIX ISSUES BEFORE DEPLOYING"
    echo ""
    echo "Common fixes:"
    echo "  Port not accessible: aws ec2 authorize-security-group-ingress ..."
    echo "  Wrong branch: ssh ec2-user@${EC2_HOST} 'cd ~/aipm && git checkout develop'"
    echo "  Uncommitted changes: ssh ec2-user@${EC2_HOST} 'cd ~/aipm && git stash'"
    echo "  Behind origin: ssh ec2-user@${EC2_HOST} 'cd ~/aipm && git pull origin develop'"
    echo "  Service not running: ssh ec2-user@${EC2_HOST} 'sudo systemctl start kiro-api-server'"
    exit 1
fi
