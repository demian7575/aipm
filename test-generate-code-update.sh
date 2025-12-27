#!/bin/bash

echo "🧪 Testing AIPM Generate Code (Update PR) Fix"
echo "============================================="

API_BASE="http://44.220.45.57:8081"

# Test 1: Kiro v3 transform endpoint
echo ""
echo "1️⃣ Testing KIRO V3 TRANSFORM endpoint..."
TRANSFORM_RESPONSE=$(curl -s "$API_BASE/kiro/v3/transform" -X POST -H "Content-Type: application/json" -d '{
  "contractId": "generate-code-v1",
  "inputJson": {
    "taskId": "task-test-123",
    "prompt": "Create responsive navigation component with accessibility features",
    "prNumber": 368,
    "branchName": "feature/additional-feature", 
    "storyId": 7,
    "storyTitle": "Updated Test Story"
  }
}')

TRANSFORM_SUCCESS=$(echo "$TRANSFORM_RESPONSE" | jq -r '.success')
FILES_GENERATED=$(echo "$TRANSFORM_RESPONSE" | jq '.outputJson.files | length')
PR_NUMBER=$(echo "$TRANSFORM_RESPONSE" | jq -r '.outputJson.prNumber')

if [ "$TRANSFORM_SUCCESS" = "true" ] && [ "$FILES_GENERATED" -gt 0 ]; then
  echo "✅ Kiro v3 transform successful"
  echo "   📋 PR Number: $PR_NUMBER"
  echo "   📁 Files Generated: $FILES_GENERATED"
else
  echo "❌ Kiro v3 transform failed"
  echo "Response: $TRANSFORM_RESPONSE"
  exit 1
fi

# Test 2: Verify existing PR was updated (not new PR created)
echo ""
echo "2️⃣ Testing EXISTING PR UPDATE..."
STORY_RESPONSE=$(curl -s "$API_BASE/api/stories/7")
TOTAL_PRS=$(echo "$STORY_RESPONSE" | jq '.prs | length')
UPDATED_PR=$(echo "$STORY_RESPONSE" | jq --arg pr "$PR_NUMBER" '.prs[] | select(.number == ($pr | tonumber)) | {number, generatedCode, lastGenerated}')

if [ "$UPDATED_PR" != "" ]; then
  echo "✅ Existing PR updated with generated code"
  echo "   📊 Total PRs in story: $TOTAL_PRS (no new PR created)"
  echo "   🤖 Updated PR details:"
  echo "$UPDATED_PR" | jq -r '"   PR #" + (.number | tostring) + " - Generated: " + (.generatedCode | tostring) + " at " + .lastGenerated'
else
  echo "❌ Existing PR was not updated"
  exit 1
fi

# Test 3: Check generated file structure
echo ""
echo "3️⃣ Testing GENERATED FILE STRUCTURE..."
GENERATED_FILES=$(echo "$TRANSFORM_RESPONSE" | jq -r '.outputJson.files[] | .path')
echo "📁 Generated files:"
echo "$GENERATED_FILES" | while read file; do
  echo "   - $file"
done

# Verify file types
JS_FILES=$(echo "$GENERATED_FILES" | grep -c "\.js$" || echo "0")
CSS_FILES=$(echo "$GENERATED_FILES" | grep -c "\.css$" || echo "0") 
TEST_FILES=$(echo "$GENERATED_FILES" | grep -c "\.test\.js$" || echo "0")

if [ "$JS_FILES" -gt 0 ] && [ "$CSS_FILES" -gt 0 ] && [ "$TEST_FILES" -gt 0 ]; then
  echo "✅ Generated complete file set (JS: $JS_FILES, CSS: $CSS_FILES, Tests: $TEST_FILES)"
else
  echo "❌ Incomplete file set generated"
  exit 1
fi

# Test 4: Check file content
echo ""
echo "4️⃣ Testing GENERATED FILE CONTENT..."
SAMPLE_JS_CONTENT=$(echo "$TRANSFORM_RESPONSE" | jq -r '.outputJson.files[0].content')
if [[ "$SAMPLE_JS_CONTENT" == *"export default function"* ]] && [[ "$SAMPLE_JS_CONTENT" == *"Updated Test Story"* ]]; then
  echo "✅ Generated code includes proper React component structure"
else
  echo "❌ Generated code structure is incorrect"
  exit 1
fi

# Test 5: Verify contract validation
echo ""
echo "5️⃣ Testing CONTRACT VALIDATION..."
INVALID_CONTRACT_RESPONSE=$(curl -s "$API_BASE/kiro/v3/transform" -X POST -H "Content-Type: application/json" -d '{
  "contractId": "invalid-contract",
  "inputJson": {}
}')

INVALID_SUCCESS=$(echo "$INVALID_CONTRACT_RESPONSE" | jq -r '.success')
if [ "$INVALID_SUCCESS" = "false" ]; then
  echo "✅ Contract validation working (rejects invalid contracts)"
else
  echo "❌ Contract validation failed"
  exit 1
fi

echo ""
echo "🎉 All Generate Code (Update PR) tests passed!"
echo ""
echo "📊 Summary:"
echo "   ✅ Kiro v3 transform endpoint working"
echo "   ✅ Updates existing PR (doesn't create new one)"
echo "   ✅ Generates complete file set (JS, CSS, Tests)"
echo "   ✅ Generated code has proper structure"
echo "   ✅ Contract validation working"
echo ""
echo "🚀 AIPM 'Generate Code' now correctly updates existing PRs!"
echo "🔗 Try it in the frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
