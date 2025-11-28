#!/bin/bash

# Test Amazon Q code generation endpoint
TASK="$1"

if [ -z "$TASK" ]; then
  TASK="Create a test.txt file with hello world"
fi

echo "Testing Amazon Q code generation..."
echo "Task: $TASK"
echo ""

curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d "{\"taskDescription\":\"$TASK\"}" \
  | python3 -m json.tool

echo ""
echo "Check PRs: https://github.com/demian7575/aipm/pulls"
