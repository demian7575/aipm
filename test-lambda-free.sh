#!/bin/bash

echo "🧪 Testing Lambda-Free Architecture"
echo "=================================="

# Test 1: Health check
echo ""
echo "1️⃣ Testing health endpoint..."
HEALTH=$(curl -s http://44.220.45.57:8081/health | jq -r '.service')
if [ "$HEALTH" = "kiro-api-server-v4-full" ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi

# Test 2: Stories API
echo ""
echo "2️⃣ Testing stories API..."
STORY_COUNT=$(curl -s http://44.220.45.57:8081/api/stories | jq 'length')
if [ "$STORY_COUNT" -gt 0 ]; then
  echo "✅ Stories API working ($STORY_COUNT stories found)"
else
  echo "❌ Stories API failed"
  exit 1
fi

# Test 3: Story draft generation
echo ""
echo "3️⃣ Testing story draft generation..."
DRAFT_RESPONSE=$(curl -s http://44.220.45.57:8081/api/stories/draft \
  -H "Content-Type: application/json" \
  -d '{"idea": "test story generation"}')

STORY_ID=$(echo "$DRAFT_RESPONSE" | jq -r '.storyId')
if [[ "$STORY_ID" =~ ^story-[0-9]+$ ]]; then
  echo "✅ Story draft generation working (ID: $STORY_ID)"
else
  echo "❌ Story draft generation failed"
  echo "Response: $DRAFT_RESPONSE"
  exit 1
fi

# Test 4: Frontend accessibility
echo ""
echo "4️⃣ Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/)
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✅ Frontend accessible"
else
  echo "❌ Frontend not accessible (HTTP $FRONTEND_STATUS)"
  exit 1
fi

# Test 5: CORS
echo ""
echo "5️⃣ Testing CORS..."
CORS_RESPONSE=$(curl -s -H "Origin: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://44.220.45.57:8081/api/stories/draft \
  -w "%{http_code}")

if [ "$CORS_RESPONSE" = "200" ]; then
  echo "✅ CORS working"
else
  echo "❌ CORS failed (HTTP $CORS_RESPONSE)"
  exit 1
fi

echo ""
echo "🎉 All tests passed! Lambda-free architecture is working!"
echo ""
echo "📊 Architecture Summary:"
echo "   Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "   API:      http://44.220.45.57:8081"
echo "   Database: DynamoDB (aipm-backend-prod-stories)"
echo "   AI:       Kiro CLI (local fallback active)"
echo ""
echo "🚀 Benefits achieved:"
echo "   ✅ No Lambda complexity"
echo "   ✅ Direct API responses"
echo "   ✅ Simplified architecture"
echo "   ✅ Lower latency"
echo "   ✅ Easier debugging"
