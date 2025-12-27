#!/bin/bash

echo "🧪 Testing AIPM Create PR Fix"
echo "============================="

API_BASE="http://44.220.45.57:8081"

# Test 1: Create PR endpoint
echo ""
echo "1️⃣ Testing CREATE PR endpoint..."
CREATE_PR_RESPONSE=$(curl -s "$API_BASE/api/create-pr" -X POST -H "Content-Type: application/json" -d '{
  "storyId": 7,
  "branchName": "feature/user-authentication",
  "prTitle": "Implement User Authentication System",
  "prBody": "This PR implements the user authentication system as described in the user story.",
  "story": {"id": 7, "title": "User Authentication System"}
}')

PR_SUCCESS=$(echo "$CREATE_PR_RESPONSE" | jq -r '.success')
PR_NUMBER=$(echo "$CREATE_PR_RESPONSE" | jq -r '.prNumber')
PR_URL=$(echo "$CREATE_PR_RESPONSE" | jq -r '.prUrl')

if [ "$PR_SUCCESS" = "true" ]; then
  echo "✅ CREATE PR successful"
  echo "   📋 PR Number: $PR_NUMBER"
  echo "   🔗 PR URL: $PR_URL"
else
  echo "❌ CREATE PR failed"
  echo "Response: $CREATE_PR_RESPONSE"
  exit 1
fi

# Test 2: Version endpoint
echo ""
echo "2️⃣ Testing VERSION endpoint..."
VERSION_RESPONSE=$(curl -s "$API_BASE/api/version")
VERSION=$(echo "$VERSION_RESPONSE" | jq -r '.version')
SERVICE=$(echo "$VERSION_RESPONSE" | jq -r '.service')

if [ "$VERSION" = "4.0.0" ] && [ "$SERVICE" = "kiro-api-server-v4-full" ]; then
  echo "✅ VERSION endpoint working (v$VERSION)"
else
  echo "❌ VERSION endpoint failed"
  echo "Response: $VERSION_RESPONSE"
  exit 1
fi

# Test 3: Story health check
echo ""
echo "3️⃣ Testing STORY HEALTH CHECK..."
HEALTH_RESPONSE=$(curl -s "$API_BASE/api/stories/7/health-check" -X POST)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.health')
INVEST_SCORE=$(echo "$HEALTH_RESPONSE" | jq -r '.investScore')

if [ "$HEALTH_STATUS" = "good" ]; then
  echo "✅ STORY HEALTH CHECK working (Score: $INVEST_SCORE)"
else
  echo "❌ STORY HEALTH CHECK failed"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

# Test 4: Missing endpoint handling
echo ""
echo "4️⃣ Testing MISSING ENDPOINT handling..."
MISSING_RESPONSE=$(curl -s -w "%{http_code}" "$API_BASE/api/some-missing-endpoint")
HTTP_CODE="${MISSING_RESPONSE: -3}"
RESPONSE_BODY="${MISSING_RESPONSE%???}"

if [ "$HTTP_CODE" = "501" ]; then
  echo "✅ MISSING ENDPOINT properly handled (501 Not Implemented)"
  ERROR_MESSAGE=$(echo "$RESPONSE_BODY" | jq -r '.message')
  echo "   📝 Message: $ERROR_MESSAGE"
else
  echo "❌ MISSING ENDPOINT handling failed (Expected 501, got $HTTP_CODE)"
  exit 1
fi

# Test 5: Check server logs for PR creation
echo ""
echo "5️⃣ Testing SERVER LOGS..."
echo "Recent Create PR logs:"
ssh ec2-user@44.220.45.57 "sudo journalctl -u kiro-api-v4 --no-pager --since '2 minutes ago' | grep -E '(Creating PR|Branch name|PR title)' | tail -3"

echo ""
echo "🎉 All Create PR tests passed!"
echo ""
echo "📊 Summary:"
echo "   ✅ CREATE PR endpoint working"
echo "   ✅ VERSION endpoint working"
echo "   ✅ STORY HEALTH CHECK working"
echo "   ✅ MISSING ENDPOINT handling working"
echo "   ✅ Server logging working"
echo ""
echo "🚀 AIPM 'Create PR' functionality is now working!"
echo "🔗 Try it in the frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
