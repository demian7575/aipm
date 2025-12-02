#!/usr/bin/env bash
# Investigate bottleneck in code generation flow

set -e

echo "🔍 Investigating Code Generation Bottleneck"
echo "==========================================="
echo ""

# Test 1: Frontend load time
echo "📊 Test 1: Frontend Load Time"
echo "------------------------------"
START=$(date +%s%3N)
curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\nSize: %{size_download} bytes\n" \
  http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
END=$(date +%s%3N)
FRONTEND_TIME=$((END - START))
echo "Frontend load: ${FRONTEND_TIME}ms"
echo ""

# Test 2: Backend API health
echo "📊 Test 2: Backend API Response Time"
echo "-------------------------------------"
START=$(date +%s%3N)
curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/health
END=$(date +%s%3N)
BACKEND_TIME=$((END - START))
echo "Backend health: ${BACKEND_TIME}ms"
echo ""

# Test 3: EC2 Terminal Server health
echo "📊 Test 3: EC2 Terminal Server Response Time"
echo "---------------------------------------------"
START=$(date +%s%3N)
curl -s http://44.220.45.57:8080/health | jq -r '.status'
END=$(date +%s%3N)
EC2_TIME=$((END - START))
echo "EC2 health: ${EC2_TIME}ms"
echo ""

# Test 4: Simulate code generation request
echo "📊 Test 4: Code Generation Request (Simulated)"
echo "-----------------------------------------------"
echo "Creating test PR and triggering code generation..."

START=$(date +%s%3N)

# Create a simple test task
RESPONSE=$(curl -s -X POST http://44.220.45.57:8080/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "test-bottleneck-'$(date +%s)'",
    "taskDescription": "Add a comment to README.md saying: Test bottleneck investigation",
    "prNumber": 999
  }')

END=$(date +%s%3N)
GENERATION_TIME=$((END - START))

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""
echo "Code generation: ${GENERATION_TIME}ms"
echo ""

# Extract timing breakdown if available
if echo "$RESPONSE" | jq -e '.timings' > /dev/null 2>&1; then
  echo "📊 Timing Breakdown:"
  echo "-------------------"
  echo "$RESPONSE" | jq -r '.timings | to_entries[] | "  \(.key): \(.value)ms"'
  echo ""
fi

# Summary
echo "==========================================="
echo "📊 SUMMARY"
echo "==========================================="
echo "Frontend load:      ${FRONTEND_TIME}ms"
echo "Backend API:        ${BACKEND_TIME}ms"
echo "EC2 Terminal:       ${EC2_TIME}ms"
echo "Code generation:    ${GENERATION_TIME}ms"
echo ""

# Identify bottleneck
if [ $GENERATION_TIME -gt 10000 ]; then
  echo "⚠️  BOTTLENECK: Code generation (${GENERATION_TIME}ms > 10s)"
  echo "   This is expected - Kiro CLI takes time to generate code"
elif [ $BACKEND_TIME -gt 1000 ]; then
  echo "⚠️  BOTTLENECK: Backend API (${BACKEND_TIME}ms > 1s)"
elif [ $FRONTEND_TIME -gt 2000 ]; then
  echo "⚠️  BOTTLENECK: Frontend load (${FRONTEND_TIME}ms > 2s)"
else
  echo "✅ No significant bottleneck detected"
fi
