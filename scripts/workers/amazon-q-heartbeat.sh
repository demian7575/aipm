#!/bin/bash
# Amazon Q Heartbeat - Checks DynamoDB queue every 5 seconds

LOCK_FILE="/home/cloudshell-user/aipm/.queue/heartbeat.lock"
TABLE_NAME="aipm-amazon-q-queue"

mkdir -p /home/cloudshell-user/aipm/.queue

# Check if already running
if [ -f "$LOCK_FILE" ]; then
  PID=$(cat "$LOCK_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Heartbeat already running (PID: $PID)"
    exit 1
  fi
fi

echo $$ > "$LOCK_FILE"

echo "🫀 Amazon Q Heartbeat started (PID: $$)"
echo "📋 Checking DynamoDB queue every 5 seconds..."
echo "🛑 Press Ctrl+C to stop"
echo ""

trap "rm -f $LOCK_FILE; echo 'Heartbeat stopped'; exit" INT TERM EXIT

cd /home/cloudshell-user/aipm

while true; do
  # Get pending tasks from DynamoDB
  TASKS=$(aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --filter-expression "#status = :pending" \
    --expression-attribute-names '{"#status":"status"}' \
    --expression-attribute-values '{":pending":{"S":"pending"}}' \
    --region us-east-1 \
    --output json 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    TASK_COUNT=$(echo "$TASKS" | jq '.Items | length')
    
    if [ "$TASK_COUNT" -gt 0 ]; then
      # Get first task
      TASK_ID=$(echo "$TASKS" | jq -r '.Items[0].id.S')
      TASK_TITLE=$(echo "$TASKS" | jq -r '.Items[0].title.S')
      TASK_DETAILS=$(echo "$TASKS" | jq -r '.Items[0].details.S')
      BRANCH_NAME=$(echo "$TASKS" | jq -r '.Items[0].branch.S')
      
      echo "⚡ Task found: $TASK_TITLE (ID: $TASK_ID)"
      echo "🤖 Amazon Q generating code..."
      
      # Mark as processing
      aws dynamodb update-item \
        --table-name "$TABLE_NAME" \
        --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
        --update-expression "SET #status = :processing" \
        --expression-attribute-names '{"#status":"status"}' \
        --expression-attribute-values '{":processing":{"S":"processing"}}' \
        --region us-east-1 > /dev/null 2>&1
      
      # Run Amazon Q
      if ./generate-code-with-q.sh "$TASK_TITLE" "$TASK_DETAILS" "$BRANCH_NAME"; then
        echo "✅ PR created successfully"
        # Mark as complete
        aws dynamodb update-item \
          --table-name "$TABLE_NAME" \
          --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
          --update-expression "SET #status = :complete, completedAt = :time" \
          --expression-attribute-names '{"#status":"status"}' \
          --expression-attribute-values "{\":complete\":{\"S\":\"complete\"},\":time\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" \
          --region us-east-1 > /dev/null 2>&1
      else
        echo "❌ Generation failed"
        # Mark as failed
        aws dynamodb update-item \
          --table-name "$TABLE_NAME" \
          --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
          --update-expression "SET #status = :failed, failedAt = :time" \
          --expression-attribute-names '{"#status":"status"}' \
          --expression-attribute-values "{\":failed\":{\"S\":\"failed\"},\":time\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" \
          --region us-east-1 > /dev/null 2>&1
      fi
      
      echo ""
    fi
  fi
  
  sleep 5
done
