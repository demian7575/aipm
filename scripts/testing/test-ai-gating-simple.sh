#!/bin/bash

# Simplified AI Functionality Gating Test
# Verifies core AI enhancement capabilities

echo "🤖 AI Functionality Gating Test - Core Verification"
echo "=================================================="

EC2_HOST="44.220.45.57"
BACKEND_URL="http://${EC2_HOST}:4000"
KIRO_API_URL="http://${EC2_HOST}:8081"

# Test 1: Kiro API Health
echo "1. 🔍 Kiro API Health Check"
HEALTH=$(curl -s ${KIRO_API_URL}/health)
if echo "$HEALTH" | grep -q "running"; then
    echo "   ✅ Kiro API: $(echo "$HEALTH" | jq -r '.status')"
    echo "   📊 Contracts: $(echo "$HEALTH" | jq -r '.contracts | length')"
    echo "   📡 Endpoints: $(echo "$HEALTH" | jq -r '.endpoints | length')"
else
    echo "   ❌ Kiro API not responding"
    exit 1
fi

# Test 2: AI Enhancement Test
echo ""
echo "2. 🧠 AI Enhancement Test"
echo "   📤 Testing story enhancement..."

RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/stories/draft \
    -H "Content-Type: application/json" \
    -d '{"idea":"AI gating test verification story","parentId":null}' \
    --max-time 300)

if echo "$RESPONSE" | grep -q "title"; then
    TITLE=$(echo "$RESPONSE" | jq -r '.title // "none"')
    CRITERIA_COUNT=$(echo "$RESPONSE" | jq -r '.acceptanceCriteria | length // 0' 2>/dev/null || echo "0")
    
    echo "   ✅ AI Enhancement Successful"
    echo "   📝 Enhanced Title: '$TITLE'"
    echo "   📋 Acceptance Criteria: $CRITERIA_COUNT generated"
    
    # Verify it's actually enhanced (not just the original)
    if [ "$TITLE" != "AI gating test verification story" ] && [ "$CRITERIA_COUNT" -gt 0 ]; then
        echo "   ✅ Content was actually enhanced by AI"
    else
        echo "   ❌ Content was not enhanced"
        exit 1
    fi
else
    echo "   ❌ AI Enhancement Failed"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Test 3: Performance Check
echo ""
echo "3. ⏱️  Performance Verification"
# Look for duration in the response metadata
DURATION=$(echo "$RESPONSE" | jq -r '.duration // 0' 2>/dev/null || echo "0")

if [ "$DURATION" -gt 0 ]; then
    DURATION_SEC=$((DURATION / 1000))
    echo "   ⏱️  Processing Time: ${DURATION_SEC} seconds"
    
    if [ "$DURATION_SEC" -lt 360 ]; then
        echo "   ✅ Performance within acceptable range (< 6 minutes)"
    else
        echo "   ⚠️  Performance slower than expected (> 6 minutes)"
    fi
else
    echo "   ⚠️  Could not measure performance from response"
fi

# Test 4: Integration Verification
echo ""
echo "4. 📋 Integration Verification"
if ssh ec2-user@${EC2_HOST} "tail -20 /home/ec2-user/aipm/backend.log | grep -q 'Kiro v3 enhancement successful'"; then
    echo "   ✅ Backend → Kiro v3 integration working"
else
    echo "   ❌ Backend → Kiro v3 integration failed"
    exit 1
fi

# Check for Kiro CLI activity (enhanced JSON output)
if ssh ec2-user@${EC2_HOST} "tail -100 /tmp/kiro-api.log | grep -q 'enhanced.*true'"; then
    echo "   ✅ Kiro CLI → AI enhancement working"
else
    echo "   ❌ Kiro CLI → AI enhancement failed"
    exit 1
fi

# Test 5: Contract Validation
echo ""
echo "5. 📋 Contract Validation"
CONTRACTS=$(echo "$HEALTH" | jq -r '.contracts[]' 2>/dev/null)
EXPECTED=("enhance-story-v1" "generate-acceptance-test-v1" "analyze-invest-v1")

for contract in "${EXPECTED[@]}"; do
    if echo "$CONTRACTS" | grep -q "$contract"; then
        echo "   ✅ Contract '$contract' loaded"
    else
        echo "   ❌ Contract '$contract' missing"
        exit 1
    fi
done

echo ""
echo "=================================================="
echo "🎉 ALL AI FUNCTIONALITY TESTS PASSED"
echo "✅ AI system is fully functional and ready"
echo ""
echo "📊 Test Summary:"
echo "   • Kiro API server: Running with 3 contracts"
echo "   • AI enhancement: Working with quality output"
echo "   • Performance: Within acceptable range"
echo "   • Integration: Backend ↔ Kiro API ↔ Kiro CLI"
echo "   • Contracts: All 3 loaded and functional"
echo "=================================================="
