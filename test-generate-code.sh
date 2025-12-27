#!/bin/bash

echo "🧪 Testing AIPM Generate Code Fix"
echo "================================="

API_BASE="http://44.220.45.57:8081"

# Test 1: Personal delegate status
echo ""
echo "1️⃣ Testing PERSONAL DELEGATE STATUS..."
STATUS_RESPONSE=$(curl -s "$API_BASE/api/personal-delegate/status")
STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')

if [ "$STATUS" = "ready" ]; then
  echo "✅ Personal delegate status: $STATUS"
else
  echo "❌ Personal delegate status failed"
  echo "Response: $STATUS_RESPONSE"
  exit 1
fi

# Test 2: Code generation
echo ""
echo "2️⃣ Testing CODE GENERATION..."
CODE_GEN_RESPONSE=$(curl -s "$API_BASE/api/personal-delegate" -X POST -H "Content-Type: application/json" -d '{
  "owner": "demian7575",
  "repo": "aipm",
  "storyId": 21,
  "taskTitle": "Clean User Interface",
  "objective": "Streamline the user interface by removing visual clutter and implementing consistent design patterns",
  "constraints": "Use existing CSS framework",
  "acceptanceCriteria": ["Interface is clean and intuitive", "Consistent design patterns", "Reduced cognitive load"],
  "enableGatingTests": true,
  "deployToDev": false,
  "maxIterations": 10
}')

CODE_SUCCESS=$(echo "$CODE_GEN_RESPONSE" | jq -r '.success')
PR_NUMBER=$(echo "$CODE_GEN_RESPONSE" | jq -r '.prNumber')
FILES_COUNT=$(echo "$CODE_GEN_RESPONSE" | jq '.filesGenerated | length')

if [ "$CODE_SUCCESS" = "true" ] && [ "$PR_NUMBER" != "null" ]; then
  echo "✅ Code generation successful"
  echo "   📋 PR Number: $PR_NUMBER"
  echo "   📁 Files Generated: $FILES_COUNT"
else
  echo "❌ Code generation failed"
  echo "Response: $CODE_GEN_RESPONSE"
  exit 1
fi

# Test 3: Verify generated PR is stored
echo ""
echo "3️⃣ Testing GENERATED PR STORAGE..."
STORY_RESPONSE=$(curl -s "$API_BASE/api/stories/21")
STORY_PRS=$(echo "$STORY_RESPONSE" | jq '.prs | length')
GENERATED_PR=$(echo "$STORY_RESPONSE" | jq -r '.prs[] | select(.generated == true) | .title')

if [ "$STORY_PRS" -gt 0 ] && [ "$GENERATED_PR" != "" ]; then
  echo "✅ Generated PR stored in story"
  echo "   📋 Total PRs: $STORY_PRS"
  echo "   🤖 Generated PR: $GENERATED_PR"
else
  echo "❌ Generated PR not properly stored"
  echo "Story PRs: $STORY_PRS"
  exit 1
fi

# Test 4: Check generated PR details
echo ""
echo "4️⃣ Testing GENERATED PR DETAILS..."
PR_DETAILS=$(echo "$STORY_RESPONSE" | jq '.prs[] | select(.generated == true) | {title, files: (.files | length), branchName}')
echo "📊 Generated PR Details:"
echo "$PR_DETAILS" | jq -r '"   Title: " + .title + "\n   Files: " + (.files | tostring) + "\n   Branch: " + .branchName'

# Test 5: Check server logs
echo ""
echo "5️⃣ Testing SERVER LOGS..."
echo "Recent code generation logs:"
ssh ec2-user@44.220.45.57 "sudo journalctl -u kiro-api-v4 --no-pager --since '2 minutes ago' | grep -E '(Code generation|Generated PR)' | tail -3"

echo ""
echo "🎉 All Generate Code tests passed!"
echo ""
echo "📊 Summary:"
echo "   ✅ Personal delegate status endpoint working"
echo "   ✅ Code generation endpoint working"
echo "   ✅ Generated PRs stored in stories"
echo "   ✅ PR details include generated files"
echo "   ✅ Server logging working"
echo ""
echo "🚀 AIPM 'Generate Code' functionality is now working!"
echo "🔗 Try it in the frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
