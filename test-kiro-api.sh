#!/bin/bash

echo "🧪 Testing Kiro API Functionality"
echo "================================="

# Test 1: Health Check
echo "1. Health Check:"
curl -s http://localhost:8081/health | jq -r '.status + " - " + .service'
echo

# Test 2: Simple Chat
echo "2. Simple Chat Test:"
curl -s -X POST http://localhost:8081/kiro/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?"}' | jq -r '.message // .error'
echo

# Test 3: Code Generation (short timeout)
echo "3. Code Generation Test:"
timeout 15s curl -s -X POST http://localhost:8081/kiro/generate-code \
  -H "Content-Type: application/json" \
  -d '{"prompt": "function add(a, b) { return a + b; }"}' | jq -r '.code // .error // "timeout"'
echo

# Test 4: Story Enhancement
echo "4. Story Enhancement Test:"
timeout 15s curl -s -X POST http://localhost:8081/kiro/enhance-story \
  -H "Content-Type: application/json" \
  -d '{
    "idea": "User login feature",
    "draft": {
      "title": "User Login",
      "description": "Allow users to log in",
      "asA": "user",
      "iWant": "to log in",
      "soThat": "I can access my account",
      "storyPoint": 3,
      "acceptanceCriteria": ["Login works"]
    }
  }' | jq -r '.title // .error // "timeout"'
echo

echo "✅ Test completed"
