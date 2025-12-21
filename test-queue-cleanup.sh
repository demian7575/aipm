#!/bin/bash

# Test script for queue cleanup endpoint

KIRO_API_URL="http://44.220.45.57:8081"

echo "🧪 Testing Kiro API Queue Cleanup Endpoint"
echo "=========================================="

# Test 1: Check health endpoint first
echo "1. Checking API health..."
curl -s "$KIRO_API_URL/health" | jq '.' || echo "Health check failed"

echo -e "\n2. Testing queue cleanup endpoint..."

# Test 2: Call cleanup endpoint
CLEANUP_RESPONSE=$(curl -s -X POST "$KIRO_API_URL/kiro/v3/queue/cleanup" \
  -H "Content-Type: application/json")

echo "Cleanup response:"
echo "$CLEANUP_RESPONSE" | jq '.' || echo "$CLEANUP_RESPONSE"

# Test 3: Check health again to see queue status
echo -e "\n3. Checking queue status after cleanup..."
curl -s "$KIRO_API_URL/health" | jq '.queuedRequests, .activeRequests' || echo "Health check failed"

echo -e "\n✅ Queue cleanup test completed"
