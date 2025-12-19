#!/bin/bash

# AI Functionality Gating Test - Step by Step Verification
# Tests actual Kiro CLI integration and AI enhancement capabilities

set -e

echo "🤖 AI Functionality Gating Test - Step by Step Verification"
echo "============================================================"
echo ""

# Configuration
EC2_HOST="44.220.45.57"
BACKEND_URL="http://${EC2_HOST}:4000"
KIRO_API_URL="http://${EC2_HOST}:8081"
TEST_ID="ai-gating-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

function test_step() {
    local step_name="$1"
    local description="$2"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo -e "${BLUE}STEP $TESTS_TOTAL: $step_name${NC}"
    echo "   $description"
}

function verify_success() {
    local message="$1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "   ${GREEN}✅ $message${NC}"
}

function verify_failure() {
    local message="$1"
    echo -e "   ${RED}❌ $message${NC}"
}

function check_logs() {
    local log_pattern="$1"
    local description="$2"
    echo "   🔍 Checking logs: $description"
    
    if ssh ec2-user@${EC2_HOST} "tail -50 /tmp/kiro-api.log | grep -q '$log_pattern'"; then
        verify_success "Found in logs: $log_pattern"
        return 0
    else
        verify_failure "Not found in logs: $log_pattern"
        return 1
    fi
}

# Start testing
echo "🚀 Starting AI Functionality Tests..."
echo ""

# STEP 1: Verify Kiro API Server Health
test_step "Kiro API Health Check" "Verify Kiro API server is running and responsive"
HEALTH_RESPONSE=$(curl -s ${KIRO_API_URL}/health || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q "running"; then
    verify_success "Kiro API server is running"
    echo "   📊 Contracts: $(echo "$HEALTH_RESPONSE" | jq -r '.contracts | length') available"
    echo "   📡 Endpoints: $(echo "$HEALTH_RESPONSE" | jq -r '.endpoints | length') active"
else
    verify_failure "Kiro API server not responding"
    exit 1
fi
echo ""

# STEP 2: Verify Kiro CLI Session
test_step "Kiro CLI Session Check" "Verify persistent Kiro CLI session is active"
if ssh ec2-user@${EC2_HOST} "ps aux | grep -v grep | grep -q 'kiro-cli'"; then
    verify_success "Kiro CLI session is active"
else
    verify_failure "Kiro CLI session not found"
fi
echo ""

# STEP 3: Test Direct Kiro API v3/transform
test_step "Direct v3/transform Test" "Test Kiro API v3/transform endpoint directly"
echo "   📤 Sending test request to v3/transform..."

# Clear logs before test
ssh ec2-user@${EC2_HOST} "echo '' > /tmp/kiro-api.log"

# Send test request
TEST_REQUEST='{
    "contractId": "enhance-story-v1",
    "inputJson": {
        "storyId": "'${TEST_ID}'",
        "title": "AI gating test story",
        "description": "Test story for AI functionality verification",
        "asA": "tester",
        "iWant": "to verify AI functionality",
        "soThat": "the system works correctly",
        "idea": "AI gating test story for verification"
    }
}'

curl -s -X POST ${KIRO_API_URL}/kiro/v3/transform \
    -H "Content-Type: application/json" \
    -d "$TEST_REQUEST" \
    --max-time 300 > /tmp/ai_test_result.json &
CURL_PID=$!

echo "   ⏳ Waiting for Kiro processing (up to 5 minutes)..."
sleep 10

# Check if request was received
if check_logs "enhance-story-v1" "v3/transform request received"; then
    verify_success "Request received by Kiro API"
else
    verify_failure "Request not received"
fi

# Check if input validation passed
sleep 5
if check_logs "Input validation passed" "Input validation"; then
    verify_success "Input validation passed"
else
    verify_failure "Input validation failed"
fi

# Check if prompt was sent to Kiro CLI
sleep 5
if check_logs "Sending simple prompt to Kiro CLI" "Prompt sent to Kiro CLI"; then
    verify_success "Prompt sent to Kiro CLI"
else
    verify_failure "Prompt not sent to Kiro CLI"
fi

# Wait for completion
echo "   ⏳ Waiting for Kiro CLI processing..."
wait $CURL_PID
echo ""

# STEP 4: Verify Kiro CLI Execution
test_step "Kiro CLI Execution Verification" "Verify Kiro CLI processed the request"

# Check for callback received
if check_logs "Callback received" "Callback from Kiro CLI"; then
    verify_success "Kiro CLI executed and sent callback"
else
    verify_failure "No callback received from Kiro CLI"
fi

# Check for output validation
if check_logs "Output validation passed" "Output validation"; then
    verify_success "Output validation passed"
else
    verify_failure "Output validation failed"
fi

# Check for completion
if check_logs "Transform completed" "Transform completion"; then
    verify_success "Transform completed successfully"
    
    # Extract duration from logs
    DURATION=$(ssh ec2-user@${EC2_HOST} "tail -50 /tmp/kiro-api.log | grep 'Transform completed' | tail -1 | grep -o '[0-9]*ms'" || echo "unknown")
    echo "   ⏱️  Processing time: $DURATION"
else
    verify_failure "Transform did not complete"
fi
echo ""

# STEP 5: Verify AI Enhancement Quality
test_step "AI Enhancement Quality Check" "Verify the AI actually enhanced the story"

if [ -f /tmp/ai_test_result.json ]; then
    RESULT_SIZE=$(wc -c < /tmp/ai_test_result.json)
    if [ $RESULT_SIZE -gt 100 ]; then
        verify_success "Response received (${RESULT_SIZE} bytes)"
        
        # Check if response contains enhanced content
        if grep -q "success.*true" /tmp/ai_test_result.json; then
            verify_success "Response indicates success"
            
            # Extract and verify enhanced content
            ENHANCED_TITLE=$(jq -r '.outputJson.title // "none"' /tmp/ai_test_result.json 2>/dev/null)
            if [ "$ENHANCED_TITLE" != "none" ] && [ "$ENHANCED_TITLE" != "AI gating test story" ]; then
                verify_success "Title was enhanced: '$ENHANCED_TITLE'"
            else
                verify_failure "Title was not enhanced"
            fi
            
            # Check for acceptance criteria
            CRITERIA_COUNT=$(jq -r '.outputJson.acceptanceCriteria | length // 0' /tmp/ai_test_result.json 2>/dev/null)
            if [ "$CRITERIA_COUNT" -gt 0 ]; then
                verify_success "Generated $CRITERIA_COUNT acceptance criteria"
            else
                verify_failure "No acceptance criteria generated"
            fi
            
        else
            verify_failure "Response indicates failure"
        fi
    else
        verify_failure "Response too small or empty"
    fi
else
    verify_failure "No response file found"
fi
echo ""

# STEP 6: Test Backend Integration
test_step "Backend Integration Test" "Test full backend → Kiro API → Kiro CLI flow"

echo "   📤 Testing backend draft generation..."
BACKEND_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/stories/draft \
    -H "Content-Type: application/json" \
    -d '{"idea":"Backend integration test story","parentId":null}' \
    --max-time 300)

if echo "$BACKEND_RESPONSE" | grep -q "title"; then
    verify_success "Backend integration successful"
    
    BACKEND_TITLE=$(echo "$BACKEND_RESPONSE" | jq -r '.title // "none"' 2>/dev/null)
    echo "   📝 Generated title: '$BACKEND_TITLE'"
    
    # Check backend logs
    if ssh ec2-user@${EC2_HOST} "tail -20 /home/ec2-user/aipm/backend.log | grep -q 'Kiro v3 enhancement successful'"; then
        verify_success "Backend successfully called Kiro v3"
    else
        verify_failure "Backend did not successfully call Kiro v3"
    fi
else
    verify_failure "Backend integration failed"
fi
echo ""

# STEP 7: Performance Verification
test_step "Performance Verification" "Verify AI processing performance meets requirements"

# Check recent processing times from logs
RECENT_DURATION=$(ssh ec2-user@${EC2_HOST} "tail -100 /tmp/kiro-api.log | grep 'Transform completed' | tail -1 | grep -o '[0-9]*ms' | sed 's/ms//'" 2>/dev/null || echo "0")

if [ "$RECENT_DURATION" -gt 0 ]; then
    DURATION_SECONDS=$((RECENT_DURATION / 1000))
    echo "   ⏱️  Last processing time: ${DURATION_SECONDS} seconds"
    
    if [ "$DURATION_SECONDS" -lt 360 ]; then  # Less than 6 minutes
        verify_success "Processing time within acceptable range (< 6 minutes)"
    else
        verify_failure "Processing time too long (> 6 minutes)"
    fi
else
    verify_failure "Could not determine processing time"
fi
echo ""

# STEP 8: Contract Validation
test_step "Contract Validation" "Verify all AI contracts are properly loaded"

CONTRACTS=$(curl -s ${KIRO_API_URL}/health | jq -r '.contracts[]' 2>/dev/null)
EXPECTED_CONTRACTS=("enhance-story-v1" "generate-acceptance-test-v1" "analyze-invest-v1")

for contract in "${EXPECTED_CONTRACTS[@]}"; do
    if echo "$CONTRACTS" | grep -q "$contract"; then
        verify_success "Contract '$contract' is loaded"
    else
        verify_failure "Contract '$contract' is missing"
    fi
done
echo ""

# Final Results
echo "============================================================"
echo -e "${BLUE}🎯 AI FUNCTIONALITY GATING TEST RESULTS${NC}"
echo "============================================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}/$TESTS_TOTAL"
echo ""

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}✅ ALL AI FUNCTIONALITY TESTS PASSED${NC}"
    echo -e "${GREEN}🚀 AI system is fully functional and ready for production${NC}"
    exit 0
else
    FAILED=$((TESTS_TOTAL - TESTS_PASSED))
    echo -e "${RED}❌ $FAILED AI FUNCTIONALITY TESTS FAILED${NC}"
    echo -e "${RED}🔧 Fix issues before production deployment${NC}"
    exit 1
fi
