#!/bin/bash

SEMANTIC_API_URL="${SEMANTIC_API_URL:-http://localhost:8082}"

echo "🧪 Testing Semantic API"
echo "📍 URL: $SEMANTIC_API_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Health check..."
curl -s "$SEMANTIC_API_URL/health" | jq
echo ""

# Test 2: Generate story draft
echo "2️⃣  Generating story draft..."
RESPONSE=$(curl -s -X POST "$SEMANTIC_API_URL/aipm/story/draft" \
  -H "Content-Type: application/json" \
  -d '{
    "featureDescription": "Add user authentication with email and password",
    "parentId": null,
    "components": ["WorkModel"]
  }')

echo "$RESPONSE" | jq
echo ""

# Extract taskId if response contains it
TASK_ID=$(echo "$RESPONSE" | jq -r '.taskId // empty')

if [ -n "$TASK_ID" ]; then
  echo "3️⃣  Checking task status..."
  sleep 2
  curl -s "$SEMANTIC_API_URL/task/$TASK_ID" | jq
fi

echo ""
echo "✅ Test completed"
