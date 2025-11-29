#!/bin/bash
# Amazon Q Heartbeat - Checks queue every 5 seconds and generates code

QUEUE_FILE="/home/cloudshell-user/aipm/.queue/tasks.json"
LOCK_FILE="/home/cloudshell-user/aipm/.queue/heartbeat.lock"

# Create queue directory
mkdir -p /home/cloudshell-user/aipm/.queue

# Check if already running
if [ -f "$LOCK_FILE" ]; then
  PID=$(cat "$LOCK_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Heartbeat already running (PID: $PID)"
    exit 1
  fi
fi

# Create lock file
echo $$ > "$LOCK_FILE"

echo "🫀 Amazon Q Heartbeat started (PID: $$)"
echo "📋 Checking queue every 5 seconds..."
echo "🛑 Press Ctrl+C to stop"
echo ""

# Cleanup on exit
trap "rm -f $LOCK_FILE; echo 'Heartbeat stopped'; exit" INT TERM EXIT

cd /home/cloudshell-user/aipm

while true; do
  # Check if queue file exists and has tasks
  if [ -f "$QUEUE_FILE" ]; then
    # Get first pending task
    TASK=$(jq -r '.tasks[] | select(.status == "pending") | @json' "$QUEUE_FILE" 2>/dev/null | head -1)
    
    if [ -n "$TASK" ] && [ "$TASK" != "null" ]; then
      TASK_ID=$(echo "$TASK" | jq -r '.id')
      TASK_TITLE=$(echo "$TASK" | jq -r '.title')
      TASK_DETAILS=$(echo "$TASK" | jq -r '.details')
      BRANCH_NAME=$(echo "$TASK" | jq -r '.branch')
      
      echo "⚡ Task found: $TASK_TITLE"
      echo "🤖 Amazon Q generating code..."
      
      # Mark as processing
      jq --arg id "$TASK_ID" '(.tasks[] | select(.id == $id) | .status) = "processing"' "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"
      
      # Run Amazon Q
      if ./generate-code-with-q.sh "$TASK_TITLE" "$TASK_DETAILS" "$BRANCH_NAME"; then
        echo "✅ PR created successfully"
        # Mark as complete
        jq --arg id "$TASK_ID" '(.tasks[] | select(.id == $id) | .status) = "complete"' "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"
      else
        echo "❌ Generation failed"
        # Mark as failed
        jq --arg id "$TASK_ID" '(.tasks[] | select(.id == $id) | .status) = "failed"' "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"
      fi
      
      echo ""
    fi
  fi
  
  # Wait 5 seconds
  sleep 5
done
