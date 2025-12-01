#!/bin/bash

# Set AWS profile if not already set
export AWS_PROFILE=${AWS_PROFILE:-myaws}

echo "💓 AIPM Heartbeat Worker Started"
echo "================================"
echo "Version: 2.0 (2025-11-30)"
echo "AWS Profile: $AWS_PROFILE"
echo "GitHub Token: ${GITHUB_TOKEN:0:10}..."
echo "Working Directory: $(pwd)"
echo "Checking queue every 1 second..."
echo "Press Ctrl+C to stop"
echo ""

# Check if kiro-cli is installed
if ! command -v kiro-cli &> /dev/null; then
    echo "❌ kiro-cli not found. Install it first:"
    echo "   curl -fsSL https://cli.kiro.dev/install | bash"
    exit 1
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set. PRs won't be created automatically."
    echo "   Export it: export GITHUB_TOKEN=your_token"
    echo ""
fi

# Track currently processing task to avoid duplicates
CURRENT_TASK=""
LOOP_COUNT=0

while true; do
    LOOP_COUNT=$((LOOP_COUNT + 1))
    
    # Log every 10 seconds
    if [ $((LOOP_COUNT % 10)) -eq 0 ]; then
        echo "[$(date '+%H:%M:%S')] Loop $LOOP_COUNT - Checking queue..."
    fi
    
    # Check for pending tasks (pending, processing, or failed)
    TASKS=$(AWS_PROFILE=myaws aws dynamodb scan \
        --table-name aipm-amazon-q-queue \
        --filter-expression "#s = :status1 OR #s = :status2 OR #s = :status3" \
        --expression-attribute-names '{"#s":"status"}' \
        --expression-attribute-values '{":status1":{"S":"pending"},":status2":{"S":"processing"},":status3":{"S":"failed"}}' \
        --region us-east-1 \
        --query 'Items[0]' \
        --output json 2>/dev/null)

    if [ "$TASKS" != "null" ] && [ -n "$TASKS" ]; then
        # Extract task details (handle multi-line JSON)
        TASK_JSON=$(echo "$TASKS" | tr -d '\n' | tr -d ' ')
        TASK_ID=$(echo "$TASK_JSON" | grep -o '"id":{"S":"[^"]*"' | sed 's/"id":{"S":"//' | sed 's/"//')
        
        echo "[$(date '+%H:%M:%S')] Found task: $TASK_ID"
        
        # Skip if already processing this task
        if [ "$TASK_ID" == "$CURRENT_TASK" ]; then
            echo "[$(date '+%H:%M:%S')] Already processing $TASK_ID, skipping..."
            sleep 1
            continue
        fi
        
        # New task found!
        CURRENT_TASK="$TASK_ID"
        
        TASK_TITLE=$(echo "$TASK_JSON" | grep -o '"title":{"S":"[^"]*"' | sed 's/"title":{"S":"//' | sed 's/"//')
        TASK_DETAILS=$(echo "$TASK_JSON" | grep -o '"details":{"S":"[^"]*"' | sed 's/"details":{"S":"//' | sed 's/"//')
        BRANCH_NAME=$(echo "$TASK_JSON" | grep -o '"branch":{"S":"[^"]*"' | sed 's/"branch":{"S":"//' | sed 's/"//')
        
        echo ""
        echo "🔔 New task detected!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📝 Task: $TASK_TITLE"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        
        # Checkout branch
        echo "🔄 Checking out branch..."
        git fetch origin 2>/dev/null
        
        if git checkout "$BRANCH_NAME" 2>/dev/null; then
            echo "✅ Branch exists, checked out"
        elif git checkout -b "$BRANCH_NAME" origin/"$BRANCH_NAME" 2>/dev/null; then
            echo "✅ Branch exists on remote, checked out"
        else
            echo "📝 Creating new branch from main..."
            git checkout main 2>/dev/null
            git pull origin main 2>/dev/null
            git checkout -b "$BRANCH_NAME"
            
            # Create placeholder file
            cat > "TASK_${TASK_ID}.md" <<EOF
# Task: $TASK_TITLE

## Details
$TASK_DETAILS

## Status
Processing by heartbeat worker...
EOF
            git add "TASK_${TASK_ID}.md"
            git commit -m "feat: $TASK_TITLE

Task queued for Amazon Q code generation.
Task ID: $TASK_ID"
            git push origin "$BRANCH_NAME" 2>/dev/null
            echo "✅ Branch created and pushed"
        fi
        
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
        
        # Create PR if it doesn't exist
        echo "🔗 Creating PR..."
        PR_RESPONSE=$(curl -s -X POST \
          -H "Authorization: token $GITHUB_TOKEN" \
          -H "Content-Type: application/json" \
          "https://api.github.com/repos/demian7575/aipm/pulls" \
          -d "{
            \"title\":\"feat: $TASK_TITLE\",
            \"body\":\"$TASK_DETAILS\\n\\nGenerated by Amazon Q via AIPM Heartbeat Worker\\nTask ID: $TASK_ID\",
            \"head\":\"$BRANCH_NAME\",
            \"base\":\"main\"
          }" 2>/dev/null)
        
        PR_NUMBER=$(echo "$PR_RESPONSE" | tr -d '\n\t' | grep -o '"number":[0-9]*' | head -1 | sed 's/"number"://')
        
        if [ -n "$PR_NUMBER" ] && [ "$PR_NUMBER" -gt 0 ] 2>/dev/null; then
          echo "✅ PR #$PR_NUMBER created: https://github.com/demian7575/aipm/pull/$PR_NUMBER"
        else
          echo "⚠️  PR may already exist or failed to create"
        fi
        
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
