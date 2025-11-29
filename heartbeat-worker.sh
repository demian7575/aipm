#!/bin/bash

echo "💓 AIPM Heartbeat Worker Started"
echo "================================"
echo "Checking queue every 1 second..."
echo "Press Ctrl+C to stop"
echo ""

# Check if kiro-cli is installed
if ! command -v kiro-cli &> /dev/null; then
    echo "❌ kiro-cli not found. Install it first:"
    echo "   curl -fsSL https://cli.kiro.dev/install | bash"
    exit 1
fi

# Track currently processing task to avoid duplicates
CURRENT_TASK=""

while true; do
    # Check for pending tasks
    TASKS=$(AWS_PROFILE=myaws aws dynamodb scan \
        --table-name aipm-amazon-q-queue \
        --filter-expression "#s = :status" \
        --expression-attribute-names '{"#s":"status"}' \
        --expression-attribute-values '{":status":{"S":"processing"}}' \
        --region us-east-1 \
        --query 'Items[0]' \
        --output json 2>/dev/null)

    if [ "$TASKS" != "null" ] && [ -n "$TASKS" ]; then
        # Extract task ID
        TASK_ID=$(echo "$TASKS" | grep -o '"id":{"S":"[^"]*"' | sed 's/"id":{"S":"//' | sed 's/"//')
        
        # Skip if already processing this task
        if [ "$TASK_ID" == "$CURRENT_TASK" ]; then
            sleep 1
            continue
        fi
        
        # New task found!
        CURRENT_TASK="$TASK_ID"
        
        TASK_TITLE=$(echo "$TASKS" | grep -o '"title":{"S":"[^"]*"' | sed 's/"title":{"S":"//' | sed 's/"//')
        TASK_DETAILS=$(echo "$TASKS" | grep -o '"details":{"S":"[^"]*"' | sed 's/"details":{"S":"//' | sed 's/"//')
        BRANCH_NAME=$(echo "$TASKS" | grep -o '"branch":{"S":"[^"]*"' | sed 's/"branch":{"S":"//' | sed 's/"//')
        
        echo ""
        echo "🔔 New task detected!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📝 Task: $TASK_TITLE"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        
        # Checkout branch
        echo "🔄 Checking out branch..."
        git fetch origin 2>/dev/null
        git checkout "$BRANCH_NAME" 2>/dev/null || git checkout -b "$BRANCH_NAME" origin/"$BRANCH_NAME" 2>/dev/null
        
        # Run Amazon Q
        echo "🤖 Running Amazon Q (this may take 2-5 minutes)..."
        echo ""
        
        kiro-cli chat --trust-all-tools <<EOF
$TASK_DETAILS

Please implement this feature following the existing code patterns in this repository.
Commit your changes when done.
EOF
        
        echo ""
        
        # Check if changes were made
        if git diff --quiet && git diff --cached --quiet; then
            echo "⚠️  No changes detected"
            CURRENT_TASK=""
            sleep 1
            continue
        fi
        
        # Push changes
        echo "📤 Pushing changes..."
        git push origin "$BRANCH_NAME" 2>/dev/null
        
        # Update status
        echo "✅ Updating task status..."
        AWS_PROFILE=myaws aws dynamodb update-item \
            --table-name aipm-amazon-q-queue \
            --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
            --update-expression "SET #s = :status" \
            --expression-attribute-names '{"#s":"status"}' \
            --expression-attribute-values '{":status":{"S":"complete"}}' \
            --region us-east-1 2>/dev/null
        
        echo "🎉 Task complete!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "💓 Waiting for next task..."
        
        CURRENT_TASK=""
    fi
    
    sleep 1
done
