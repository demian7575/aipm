#!/bin/bash
# Test worker pool functionality

echo "🧪 Testing Kiro Worker Pool"
echo ""

# Test health endpoint
echo "1️⃣ Testing health endpoint..."
curl -s http://localhost:8080/health | jq '.'
echo ""

# Test parallel requests
echo "2️⃣ Testing parallel requests (should use both workers)..."
echo "Sending 2 concurrent requests..."

curl -s -X POST http://localhost:8080/kiro/generate-story \
  -H "Content-Type: application/json" \
  -d '{"idea":"User can export data","parentStory":null}' &

curl -s -X POST http://localhost:8080/kiro/generate-story \
  -H "Content-Type: application/json" \
  -d '{"idea":"User can import data","parentStory":null}' &

wait

echo ""
echo "✅ Test complete"
