#!/bin/bash

set -e

API_URL="http://44.220.45.57:8081"

echo "🧪 Testing Kiro V3 Development Deployment"
echo "=========================================="
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH=$(curl -s "$API_URL/health")
echo "$HEALTH" | jq '.'

VERSION=$(echo "$HEALTH" | jq -r '.version')
if [ "$VERSION" = "3.0" ]; then
  echo "✅ V3 API running"
else
  echo "❌ Wrong version: $VERSION"
  exit 1
fi

echo ""

# Test 2: Transform endpoint with enhance-story contract
echo "Test 2: Enhance Story Transform"
echo "--------------------------------"

INPUT_JSON='{
  "contractId": "enhance-story-v1",
  "inputJson": {
    "storyId": "test-story-123",
    "title": "Implement login",
    "description": "Add login page",
    "asA": "user",
    "iWant": "to login",
    "soThat": "I can access the system",
    "storyPoint": 5,
    "components": ["Authentication"]
  }
}'

echo "Request:"
echo "$INPUT_JSON" | jq '.'

echo ""
echo "Sending to Kiro API..."
RESPONSE=$(curl -s -X POST "$API_URL/kiro/v3/transform" \
  -H "Content-Type: application/json" \
  -d "$INPUT_JSON")

echo "Response:"
echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Transform succeeded"
  
  # Check output fields
  STORY_ID=$(echo "$RESPONSE" | jq -r '.outputJson.storyId')
  TITLE=$(echo "$RESPONSE" | jq -r '.outputJson.title')
  CRITERIA_COUNT=$(echo "$RESPONSE" | jq -r '.outputJson.acceptanceCriteria | length')
  
  echo "   Story ID: $STORY_ID"
  echo "   Enhanced Title: $TITLE"
  echo "   Acceptance Criteria: $CRITERIA_COUNT items"
  
  if [ "$STORY_ID" != "test-story-123" ]; then
    echo "❌ Story ID not preserved"
    exit 1
  fi
  
  if [ "$CRITERIA_COUNT" -lt 3 ]; then
    echo "❌ Not enough acceptance criteria"
    exit 1
  fi
  
else
  echo "❌ Transform failed"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "📊 Deployment Status:"
echo "   Kiro API V3: Running"
echo "   Kiro Worker V3: Running"
echo "   Queue Table: aipm-kiro-queue-dev"
echo ""
echo "🔗 Endpoints:"
echo "   Health: $API_URL/health"
echo "   Transform: $API_URL/kiro/v3/transform"
