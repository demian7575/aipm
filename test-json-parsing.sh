#!/bin/bash

set -e

echo "Testing grep/sed JSON parsing..."

# Test case 1: Extract number field
PR_RESPONSE='{"number":123,"state":"open","title":"Test PR"}'
PR_NUMBER=$(echo "$PR_RESPONSE" | grep -o '"number":[0-9]*' | head -1 | sed 's/"number"://')

if [ "$PR_NUMBER" = "123" ]; then
  echo "✅ Test 1 passed: Extracted PR number = $PR_NUMBER"
else
  echo "❌ Test 1 failed: Expected 123, got $PR_NUMBER"
  exit 1
fi

# Test case 2: Multi-line JSON
PR_RESPONSE='{
  "number": 456,
  "state": "open"
}'
PR_NUMBER=$(echo "$PR_RESPONSE" | grep -o '"number":[[:space:]]*[0-9]*' | head -1 | sed 's/"number":[[:space:]]*//')

if [ "$PR_NUMBER" = "456" ]; then
  echo "✅ Test 2 passed: Extracted PR number from multi-line = $PR_NUMBER"
else
  echo "❌ Test 2 failed: Expected 456, got $PR_NUMBER"
  exit 1
fi

# Test case 3: Number with spaces
PR_RESPONSE='{"number": 789, "state": "open"}'
PR_NUMBER=$(echo "$PR_RESPONSE" | grep -o '"number":[[:space:]]*[0-9]*' | head -1 | sed 's/"number":[[:space:]]*//')

if [ "$PR_NUMBER" = "789" ]; then
  echo "✅ Test 3 passed: Extracted PR number with spaces = $PR_NUMBER"
else
  echo "❌ Test 3 failed: Expected 789, got $PR_NUMBER"
  exit 1
fi

# Test case 4: Empty response
PR_RESPONSE='{}'
PR_NUMBER=$(echo "$PR_RESPONSE" | grep -o '"number":[0-9]*' | head -1 | sed 's/"number"://')

if [ -z "$PR_NUMBER" ]; then
  echo "✅ Test 4 passed: Empty response handled correctly"
else
  echo "❌ Test 4 failed: Expected empty, got $PR_NUMBER"
  exit 1
fi

echo ""
echo "🎉 All grep/sed JSON parsing tests passed!"
