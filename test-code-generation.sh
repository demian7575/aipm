#!/usr/bin/env bash
# Test the EC2 code generation endpoint

echo "🧪 Testing Code Generation Endpoint"
echo "===================================="

curl -X POST http://44.220.45.57:8080/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "test-branch-'$(date +%s)'",
    "taskDescription": "Add a comment to README.md saying this is a test",
    "prNumber": 999
  }' \
  2>&1 | jq '.'

echo ""
echo "✅ Test complete"
