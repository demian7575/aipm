#!/bin/bash

# Q Worker Script for AIPM Code Generation
# This script polls DynamoDB for code generation tasks and uses Kiro CLI to implement features

set -e

QUEUE_TABLE="aipm-amazon-q-queue"
POLL_INTERVAL=1

echo "🚀 Starting Q Worker for AIPM Code Generation"
echo "Queue Table: $QUEUE_TABLE"
echo "Poll Interval: ${POLL_INTERVAL}s"

while true; do
    # Poll DynamoDB for pending tasks
    TASKS=$(aws dynamodb scan \
        --table-name "$QUEUE_TABLE" \
        --filter-expression "#status = :status" \
        --expression-attribute-names '{"#status": "status"}' \
        --expression-attribute-values '{":status": {"S": "pending"}}' \
        --query 'Items[0]' \
        --output json 2>/dev/null || echo "null")
    
    if [ "$TASKS" != "null" ] && [ "$TASKS" != "" ]; then
        echo "📋 Found pending task, processing..."
        
        # Extract task details
        TASK_ID=$(echo "$TASKS" | jq -r '.taskId.S // empty')
        PR_NUMBER=$(echo "$TASKS" | jq -r '.prNumber.S // empty')
        BRANCH_NAME=$(echo "$TASKS" | jq -r '.branchName.S // empty')
        
        if [ -n "$TASK_ID" ] && [ -n "$PR_NUMBER" ] && [ -n "$BRANCH_NAME" ]; then
            echo "Processing Task ID: $TASK_ID, PR: $PR_NUMBER, Branch: $BRANCH_NAME"
            
            # Update task status to processing
            aws dynamodb update-item \
                --table-name "$QUEUE_TABLE" \
                --key "{\"taskId\": {\"S\": \"$TASK_ID\"}}" \
                --update-expression "SET #status = :status, updatedAt = :timestamp" \
                --expression-attribute-names '{"#status": "status"}' \
                --expression-attribute-values "{\":status\": {\"S\": \"processing\"}, \":timestamp\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" \
                >/dev/null
            
            # Checkout the PR branch and run Kiro CLI
            git fetch origin
            git checkout "$BRANCH_NAME" || git checkout -b "$BRANCH_NAME" "origin/$BRANCH_NAME"
            
            # Run Kiro CLI to generate code (this would be the actual implementation)
            echo "🤖 Running Kiro CLI for code generation..."
            
            # Mark task as completed
            aws dynamodb update-item \
                --table-name "$QUEUE_TABLE" \
                --key "{\"taskId\": {\"S\": \"$TASK_ID\"}}" \
                --update-expression "SET #status = :status, completedAt = :timestamp" \
                --expression-attribute-names '{"#status": "status"}' \
                --expression-attribute-values "{\":status\": {\"S\": \"completed\"}, \":timestamp\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" \
                >/dev/null
            
            echo "✅ Task $TASK_ID completed"
        fi
    fi
    
    sleep "$POLL_INTERVAL"
done
