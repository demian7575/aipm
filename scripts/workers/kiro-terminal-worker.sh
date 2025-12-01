#!/bin/bash
# Kiro terminal worker - handles interactive terminal sessions

set -e

QUEUE_TABLE="aipm-amazon-q-queue"
REGION="us-east-1"

echo "🖥️  Kiro terminal worker started"
echo "Polling queue: $QUEUE_TABLE (every 500ms)"

while true; do
  # Get pending terminal sessions from DynamoDB
  SESSIONS=$(aws dynamodb scan \
    --table-name "$QUEUE_TABLE" \
    --filter-expression "#type = :terminal AND #status = :pending" \
    --expression-attribute-names '{"#type":"type","#status":"status"}' \
    --expression-attribute-values '{":terminal":{"S":"terminal"},":pending":{"S":"pending"}}' \
    --region "$REGION" \
    --output json 2>/dev/null)
  
  SESSION_COUNT=$(echo "$SESSIONS" | jq '.Items | length')
  
  if [ "$SESSION_COUNT" -gt 0 ]; then
    echo "📋 Found $SESSION_COUNT pending terminal session(s)"
    
    # Process each session
    echo "$SESSIONS" | jq -c '.Items[]' | while read -r session; do
      SESSION_ID=$(echo "$session" | jq -r '.id.S')
      BRANCH=$(echo "$session" | jq -r '.branch.S')
      
      echo "🔨 Processing terminal session: $SESSION_ID"
      echo "   Branch: $BRANCH"
      
      # Update status to running
      aws dynamodb update-item \
        --table-name "$QUEUE_TABLE" \
        --key "{\"id\":{\"S\":\"$SESSION_ID\"}}" \
        --update-expression "SET #status = :running" \
        --expression-attribute-names '{"#status":"status"}' \
        --expression-attribute-values '{":running":{"S":"running"}}' \
        --region "$REGION"
      
      # Checkout PR branch
      git fetch origin 2>/dev/null || true
      git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || true
      git pull origin "$BRANCH" 2>/dev/null || true
      
      # Write branch checkout message to output
      OUTPUT_MSG="✓ Checked out branch: $BRANCH\r\n\r\n🤖 Starting Kiro CLI...\r\n\r\n"
      aws dynamodb update-item \
        --table-name "$QUEUE_TABLE" \
        --key "{\"id\":{\"S\":\"$SESSION_ID\"}}" \
        --update-expression "SET #output = list_append(if_not_exists(#output, :empty), :msg)" \
        --expression-attribute-names '{"#output":"output"}' \
        --expression-attribute-values "{\":msg\":{\"L\":[{\"M\":{\"data\":{\"S\":\"$OUTPUT_MSG\"},\"timestamp\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}}}]},\":empty\":{\"L\":[]}}" \
        --region "$REGION"
      
      # Start Kiro CLI in background with PTY
      # Use script command to create a pseudo-terminal
      FIFO_IN="/tmp/kiro-input-$SESSION_ID"
      FIFO_OUT="/tmp/kiro-output-$SESSION_ID"
      mkfifo "$FIFO_IN" "$FIFO_OUT" 2>/dev/null || true
      
      # Start Kiro in background
      (
        script -q -c "kiro-cli chat" /dev/null < "$FIFO_IN" > "$FIFO_OUT" 2>&1
        
        # When Kiro exits, mark session as complete
        aws dynamodb update-item \
          --table-name "$QUEUE_TABLE" \
          --key "{\"id\":{\"S\":\"$SESSION_ID\"}}" \
          --update-expression "SET #status = :complete" \
          --expression-attribute-names '{"#status":"status"}' \
          --expression-attribute-values '{":complete":{"S":"complete"}}' \
          --region "$REGION"
        
        # Return to main branch
        git checkout main 2>/dev/null || true
        
        # Cleanup FIFOs
        rm -f "$FIFO_IN" "$FIFO_OUT"
      ) &
      
      KIRO_PID=$!
      
      # Monitor session for input and output
      while true; do
        # Check session status
        SESSION_DATA=$(aws dynamodb get-item \
          --table-name "$QUEUE_TABLE" \
          --key "{\"id\":{\"S\":\"$SESSION_ID\"}}" \
          --region "$REGION" \
          --output json 2>/dev/null)
        
        STATUS=$(echo "$SESSION_DATA" | jq -r '.Item.status.S // "unknown"')
        
        if [ "$STATUS" = "stopped" ] || [ "$STATUS" = "complete" ]; then
          echo "✓ Session $SESSION_ID ended"
          kill $KIRO_PID 2>/dev/null || true
          rm -f "$FIFO_IN" "$FIFO_OUT"
          git checkout main 2>/dev/null || true
          break
        fi
        
        # Read new input from DynamoDB and pipe to Kiro
        INPUT_DATA=$(echo "$SESSION_DATA" | jq -r '.Item.input.L[]? | .M.data.S' 2>/dev/null)
        if [ -n "$INPUT_DATA" ]; then
          echo "$INPUT_DATA" > "$FIFO_IN" &
          
          # Clear processed input
          aws dynamodb update-item \
            --table-name "$QUEUE_TABLE" \
            --key "{\"id\":{\"S\":\"$SESSION_ID\"}}" \
            --update-expression "SET #input = :empty" \
            --expression-attribute-names '{"#input":"input"}' \
            --expression-attribute-values '{":empty":{"L":[]}}' \
            --region "$REGION" 2>/dev/null || true
        fi
        
        # Read output from Kiro and write to DynamoDB
        if [ -p "$FIFO_OUT" ]; then
          timeout 0.1 cat "$FIFO_OUT" 2>/dev/null | while IFS= read -r line; do
            ESCAPED_LINE=$(echo "$line" | jq -Rs .)
            aws dynamodb update-item \
              --table-name "$QUEUE_TABLE" \
              --key "{\"id\":{\"S\":\"$SESSION_ID\"}}" \
              --update-expression "SET #output = list_append(if_not_exists(#output, :empty), :msg)" \
              --expression-attribute-names '{"#output":"output"}' \
              --expression-attribute-values "{\":msg\":{\"L\":[{\"M\":{\"data\":{\"S\":$ESCAPED_LINE},\"timestamp\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}}}]},\":empty\":{\"L\":[]}}" \
              --region "$REGION" 2>/dev/null || true
          done
        fi
        
        sleep 0.5
      done
    done
  fi
  
  # Wait 500ms before next poll
  sleep 0.5
done
