#!/bin/bash

echo "🧪 Testing AIPM Create Story Fix"
echo "================================"

API_BASE="http://44.220.45.57:8081"

# Test 1: Create Story
echo ""
echo "1️⃣ Testing CREATE story..."
CREATE_RESPONSE=$(curl -s "$API_BASE/api/stories" -X POST -H "Content-Type: application/json" -d '{
  "title": "Test User Registration",
  "description": "User registration functionality",
  "asA": "new user",
  "iWant": "to create an account",
  "soThat": "I can access the system",
  "status": "Draft"
}')

STORY_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
if [[ "$STORY_ID" =~ ^[0-9]+$ ]]; then
  echo "✅ CREATE story successful (ID: $STORY_ID)"
else
  echo "❌ CREATE story failed"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

# Test 2: Read Story
echo ""
echo "2️⃣ Testing READ story..."
READ_RESPONSE=$(curl -s "$API_BASE/api/stories/$STORY_ID")
READ_TITLE=$(echo "$READ_RESPONSE" | jq -r '.title')
if [ "$READ_TITLE" = "Test User Registration" ]; then
  echo "✅ READ story successful"
else
  echo "❌ READ story failed"
  echo "Response: $READ_RESPONSE"
  exit 1
fi

# Test 3: Update Story
echo ""
echo "3️⃣ Testing UPDATE story..."
UPDATE_RESPONSE=$(curl -s "$API_BASE/api/stories/$STORY_ID" -X PUT -H "Content-Type: application/json" -d '{
  "title": "Enhanced User Registration",
  "status": "Ready"
}')

UPDATE_TITLE=$(echo "$UPDATE_RESPONSE" | jq -r '.title')
if [ "$UPDATE_TITLE" = "Enhanced User Registration" ]; then
  echo "✅ UPDATE story successful"
else
  echo "❌ UPDATE story failed"
  echo "Response: $UPDATE_RESPONSE"
  exit 1
fi

# Test 4: List Stories
echo ""
echo "4️⃣ Testing LIST stories..."
LIST_RESPONSE=$(curl -s "$API_BASE/api/stories")
STORY_COUNT=$(echo "$LIST_RESPONSE" | jq 'length')
if [ "$STORY_COUNT" -gt 0 ]; then
  echo "✅ LIST stories successful ($STORY_COUNT stories)"
else
  echo "❌ LIST stories failed"
  exit 1
fi

# Test 5: Delete Story
echo ""
echo "5️⃣ Testing DELETE story..."
DELETE_RESPONSE=$(curl -s "$API_BASE/api/stories/$STORY_ID" -X DELETE)
DELETE_MESSAGE=$(echo "$DELETE_RESPONSE" | jq -r '.message')
if [ "$DELETE_MESSAGE" = "Story deleted successfully" ]; then
  echo "✅ DELETE story successful"
else
  echo "❌ DELETE story failed"
  echo "Response: $DELETE_RESPONSE"
  exit 1
fi

# Test 6: Verify Deletion
echo ""
echo "6️⃣ Testing story deletion verification..."
VERIFY_RESPONSE=$(curl -s -w "%{http_code}" "$API_BASE/api/stories/$STORY_ID")
if [[ "$VERIFY_RESPONSE" == *"404"* ]]; then
  echo "✅ Story deletion verified (404 Not Found)"
else
  echo "❌ Story deletion verification failed"
  echo "Response: $VERIFY_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 All CRUD operations working!"
echo ""
echo "📊 Summary:"
echo "   ✅ CREATE story - Numeric ID generation"
echo "   ✅ READ story - Single story retrieval"
echo "   ✅ UPDATE story - Partial updates"
echo "   ✅ LIST stories - All stories"
echo "   ✅ DELETE story - Story removal"
echo "   ✅ Proper error handling"
echo ""
echo "🚀 AIPM 'Create Story' functionality is now working!"
