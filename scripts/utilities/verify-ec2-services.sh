#!/bin/bash
# EC2 Services Verification Script

set -e

EC2_HOST="44.197.204.18"
PASSED=0
FAILED=0

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          EC2 SERVICES VERIFICATION                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo "Testing: $name"
    echo "URL: $url"
    
    response=$(curl -s -m 5 "$url" 2>&1)
    status=$?
    
    if [ $status -eq 0 ] && echo "$response" | grep -q "$expected"; then
        echo "✅ PASS: $name is working"
        ((PASSED++))
    else
        echo "❌ FAIL: $name is not responding correctly"
        echo "Response: $response"
        ((FAILED++))
    fi
    echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. EC2 INSTANCE STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

aws ec2 describe-instances \
    --instance-ids i-016241c7a18884e80 \
    --region us-east-1 \
    --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress,InstanceType]' \
    --output table

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. SERVICE HEALTH CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test Terminal Server
test_endpoint "Terminal Server" "http://$EC2_HOST:8080/health" "status"

# Test Kiro API
test_endpoint "Kiro API" "http://$EC2_HOST:8081/health" "status"

# Test PR Processor
test_endpoint "PR Processor" "http://$EC2_HOST:8082/health" "status"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. DETAILED SERVICE STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Terminal Server Details:"
curl -s http://$EC2_HOST:8080/health | jq '.' 2>/dev/null || curl -s http://$EC2_HOST:8080/health
echo ""

echo "Kiro API Details:"
curl -s http://$EC2_HOST:8081/health | jq '.' 2>/dev/null || curl -s http://$EC2_HOST:8081/health
echo ""

echo "PR Processor Details:"
curl -s http://$EC2_HOST:8082/health | jq '.' 2>/dev/null || curl -s http://$EC2_HOST:8082/health
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. SSH CONNECTIVITY TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@$EC2_HOST "echo 'SSH OK'" 2>/dev/null | grep -q "SSH OK"; then
    echo "✅ SSH connection successful"
    ((PASSED++))
else
    echo "❌ SSH connection failed"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL EC2 SERVICES ARE WORKING CORRECTLY"
    exit 0
else
    echo "⚠️  SOME EC2 SERVICES HAVE ISSUES"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. SSH to EC2: ssh ec2-user@$EC2_HOST"
    echo "2. Check service status: sudo systemctl status kiro-terminal"
    echo "3. Check logs: tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log"
    exit 1
fi
