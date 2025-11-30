#!/bin/bash
# Test grep/sed JSON parsing capabilities

set -e

echo "Testing grep/sed JSON parsing..."

# Test JSON
JSON='{"name":"test","value":123,"status":"complete"}'

# Test grep extraction
NAME=$(echo "$JSON" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
VALUE=$(echo "$JSON" | grep -o '"value":[0-9]*' | sed 's/"value":\([0-9]*\)/\1/')
STATUS=$(echo "$JSON" | grep -o '"status":"[^"]*"' | sed 's/"status":"\([^"]*\)"/\1/')

# Verify results
[ "$NAME" = "test" ] || { echo "FAIL: name=$NAME"; exit 1; }
[ "$VALUE" = "123" ] || { echo "FAIL: value=$VALUE"; exit 1; }
[ "$STATUS" = "complete" ] || { echo "FAIL: status=$STATUS"; exit 1; }

echo "✅ All grep/sed JSON parsing tests passed"
echo "  name: $NAME"
echo "  value: $VALUE"
echo "  status: $STATUS"
