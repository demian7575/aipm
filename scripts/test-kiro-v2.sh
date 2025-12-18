#!/bin/bash

# Test Kiro API V2 with structured protocol

set -e

API_URL="http://localhost:8081"
LOG_FILE="/tmp/kiro-v2-test-$(date +%Y%m%d-%H%M%S).log"

echo "🧪 Testing Kiro API V2" | tee -a "$LOG_FILE"
echo "📝 Logging to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Test 1: Health check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "Test 1: Health Check" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

HEALTH_RESPONSE=$(curl -s "$API_URL/health")
echo "Response:" | tee -a "$LOG_FILE"
echo "$HEALTH_RESPONSE" | jq '.' | tee -a "$LOG_FILE"

VERSION=$(echo "$HEALTH_RESPONSE" | jq -r '.version')
if [ "$VERSION" = "2.0" ]; then
  echo "✅ Health check passed - V2 API running" | tee -a "$LOG_FILE"
else
  echo "❌ Health check failed - Expected version 2.0, got $VERSION" | tee -a "$LOG_FILE"
  exit 1
fi

echo "" | tee -a "$LOG_FILE"

# Test 2: Chat endpoint (simplest)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "Test 2: Chat Endpoint" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

CHAT_PAYLOAD='{
  "prompt": "What is 2+2? Respond with JSON containing a message field."
}'

echo "Request:" | tee -a "$LOG_FILE"
echo "$CHAT_PAYLOAD" | jq '.' | tee -a "$LOG_FILE"

CHAT_RESPONSE=$(curl -s -X POST "$API_URL/kiro/v2/chat" \
  -H "Content-Type: application/json" \
  -d "$CHAT_PAYLOAD")

echo "Response:" | tee -a "$LOG_FILE"
echo "$CHAT_RESPONSE" | jq '.' | tee -a "$LOG_FILE"

SUCCESS=$(echo "$CHAT_RESPONSE" | jq -r '.success')
MESSAGE=$(echo "$CHAT_RESPONSE" | jq -r '.message')

if [ "$SUCCESS" = "true" ] && [ -n "$MESSAGE" ]; then
  echo "✅ Chat endpoint passed" | tee -a "$LOG_FILE"
else
  echo "❌ Chat endpoint failed" | tee -a "$LOG_FILE"
  exit 1
fi

echo "" | tee -a "$LOG_FILE"

# Test 3: Enhance story endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "Test 3: Enhance Story Endpoint" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

ENHANCE_PAYLOAD='{
  "idea": "User login feature",
  "draft": {
    "title": "Implement login",
    "description": "Add login page",
    "asA": "user",
    "iWant": "to login",
    "soThat": "I can access the system",
    "storyPoint": 5
  },
  "parent": {
    "title": "Authentication System"
  }
}'

echo "Request:" | tee -a "$LOG_FILE"
echo "$ENHANCE_PAYLOAD" | jq '.' | tee -a "$LOG_FILE"

ENHANCE_RESPONSE=$(curl -s -X POST "$API_URL/kiro/v2/enhance-story" \
  -H "Content-Type: application/json" \
  -d "$ENHANCE_PAYLOAD")

echo "Response:" | tee -a "$LOG_FILE"
echo "$ENHANCE_RESPONSE" | jq '.' | tee -a "$LOG_FILE"

SUCCESS=$(echo "$ENHANCE_RESPONSE" | jq -r '.success')
TITLE=$(echo "$ENHANCE_RESPONSE" | jq -r '.title')
CRITERIA_COUNT=$(echo "$ENHANCE_RESPONSE" | jq -r '.acceptanceCriteria | length')

if [ "$SUCCESS" = "true" ] && [ -n "$TITLE" ] && [ "$CRITERIA_COUNT" -gt 0 ]; then
  echo "✅ Enhance story endpoint passed" | tee -a "$LOG_FILE"
  echo "   Enhanced title: $TITLE" | tee -a "$LOG_FILE"
  echo "   Acceptance criteria: $CRITERIA_COUNT items" | tee -a "$LOG_FILE"
else
  echo "❌ Enhance story endpoint failed" | tee -a "$LOG_FILE"
  exit 1
fi

echo "" | tee -a "$LOG_FILE"

# Test 4: Generate acceptance test endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "Test 4: Generate Acceptance Test Endpoint" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

TEST_PAYLOAD='{
  "story": {
    "title": "User login",
    "description": "Implement login page",
    "asA": "user",
    "iWant": "to login",
    "soThat": "I can access the system"
  },
  "ordinal": 1,
  "reason": "Verify successful login",
  "idea": "Test with valid credentials"
}'

echo "Request:" | tee -a "$LOG_FILE"
echo "$TEST_PAYLOAD" | jq '.' | tee -a "$LOG_FILE"

TEST_RESPONSE=$(curl -s -X POST "$API_URL/kiro/v2/generate-acceptance-test" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

echo "Response:" | tee -a "$LOG_FILE"
echo "$TEST_RESPONSE" | jq '.' | tee -a "$LOG_FILE"

SUCCESS=$(echo "$TEST_RESPONSE" | jq -r '.success')
TEST_TITLE=$(echo "$TEST_RESPONSE" | jq -r '.title')
GIVEN_COUNT=$(echo "$TEST_RESPONSE" | jq -r '.given | length')
WHEN_COUNT=$(echo "$TEST_RESPONSE" | jq -r '.when | length')
THEN_COUNT=$(echo "$TEST_RESPONSE" | jq -r '.then | length')

if [ "$SUCCESS" = "true" ] && [ -n "$TEST_TITLE" ] && [ "$GIVEN_COUNT" -gt 0 ] && [ "$WHEN_COUNT" -gt 0 ] && [ "$THEN_COUNT" -gt 0 ]; then
  echo "✅ Generate acceptance test endpoint passed" | tee -a "$LOG_FILE"
  echo "   Test title: $TEST_TITLE" | tee -a "$LOG_FILE"
  echo "   Given: $GIVEN_COUNT, When: $WHEN_COUNT, Then: $THEN_COUNT" | tee -a "$LOG_FILE"
else
  echo "❌ Generate acceptance test endpoint failed" | tee -a "$LOG_FILE"
  exit 1
fi

echo "" | tee -a "$LOG_FILE"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "✅ All tests passed!" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📊 Test Summary:" | tee -a "$LOG_FILE"
echo "   ✅ Health check" | tee -a "$LOG_FILE"
echo "   ✅ Chat endpoint" | tee -a "$LOG_FILE"
echo "   ✅ Enhance story endpoint" | tee -a "$LOG_FILE"
echo "   ✅ Generate acceptance test endpoint" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📝 Full log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
