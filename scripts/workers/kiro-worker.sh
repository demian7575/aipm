#!/bin/bash
# Kiro worker - polls DynamoDB queue and generates code

set -e

QUEUE_TABLE="aipm-amazon-q-queue"
REGION="us-east-1"

echo "🤖 Kiro worker started"
echo "Polling queue: $QUEUE_TABLE (every 1 second)"

while true; do
  # Get pending tasks from DynamoDB
  TASKS=$(aws dynamodb scan \
    --table-name "$QUEUE_TABLE" \
    --filter-expression "#status = :pending" \
    --expression-attribute-names '{"#status":"status"}' \
    --expression-attribute-values '{":pending":{"S":"pending"}}' \
    --region "$REGION" \
    --output json 2>/dev/null)
  
  TASK_COUNT=$(echo "$TASKS" | jq '.Items | length')
  
  if [ "$TASK_COUNT" -gt 0 ]; then
    echo "📋 Found $TASK_COUNT pending task(s)"
    
    # Process each task
    echo "$TASKS" | jq -c '.Items[]' | while read -r task; do
      TASK_ID=$(echo "$task" | jq -r '.id.S')
      TITLE=$(echo "$task" | jq -r '.title.S')
      DETAILS=$(echo "$task" | jq -r '.details.S')
      BRANCH=$(echo "$task" | jq -r '.branch.S')
      PR_NUMBER=$(echo "$task" | jq -r '.prNumber.N')
      
      echo "🔨 Processing: $TASK_ID - $TITLE"
      echo "   Branch: $BRANCH"
      echo "   PR: #$PR_NUMBER"
      
      # Checkout PR branch (stash any local changes first)
      git stash push -m "Auto-stash before processing $TASK_ID" 2>/dev/null || true
      git fetch origin
      git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" origin/"$BRANCH"
      git pull origin "$BRANCH"
      
      # Use Kiro to generate code
      echo "💬 Asking Kiro..."
      kiro-cli chat "$TITLE

$DETAILS" --trust-all-tools || true
      
      # Check if Kiro made changes
      if [ -n "$(git status --porcelain)" ]; then
        echo "✅ Kiro generated changes"
        
        # Remove placeholder file if exists
        git rm -f TASK.md 2>/dev/null || true
        
        # Commit changes
        git add .
        git commit -m "feat: Kiro generated implementation

$DETAILS"
        
        # Push to PR branch
        git push origin "$BRANCH"
        
        # Update status to complete
        aws dynamodb update-item \
          --table-name "$QUEUE_TABLE" \
          --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
          --update-expression "SET #status = :complete" \
          --expression-attribute-names '{"#status":"status"}' \
          --expression-attribute-values '{":complete":{"S":"complete"}}' \
          --region "$REGION"
        
        echo "✅ Code pushed to PR #$PR_NUMBER"
      else
        echo "⚠️ No changes generated"
        
        # Update status to failed
        aws dynamodb update-item \
          --table-name "$QUEUE_TABLE" \
          --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
          --update-expression "SET #status = :failed, errorMessage = :error" \
          --expression-attribute-names '{"#status":"status"}' \
          --expression-attribute-values '{":failed":{"S":"failed"},":error":{"S":"No code generated"}}' \
          --region "$REGION"
      fi
      
      # Return to main branch
      git checkout main 2>/dev/null || true
    done
  fi
  
  # Wait 1 second before next poll
  sleep 1
done
