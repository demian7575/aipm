#!/bin/bash
# Test acceptance test draft generation

STORY_ID=1768491998873
API_URL="http://44.222.168.46"

echo "Testing draft generation for story $STORY_ID"
echo "=========================================="

# Get story details
echo -e "\n1. Story details:"
curl -s "$API_URL/api/stories" | jq ".[] | select(.id == $STORY_ID) | {id, title, asA, iWant, soThat}"

# Generate draft
echo -e "\n2. Generating draft:"
RESPONSE=$(curl -s -X POST "$API_URL/api/stories/$STORY_ID/tests/draft" \
  -H "Content-Type: application/json" \
  -d '{"idea":"test the login feature"}')

echo "$RESPONSE" | jq '.'

# Check field lengths
echo -e "\n3. Field lengths:"
echo "$RESPONSE" | jq '{givenLength: (.given | length), whenLength: (.when | length), thenLength: (.then | length)}'
