#!/bin/bash
set -e

echo "🤖 Local Amazon Q Worker"
echo "========================"
echo ""

# Check if kiro-cli is installed
if ! command -v kiro-cli &> /dev/null; then
    echo "❌ kiro-cli not found. Install it first:"
    echo "   curl -fsSL https://cli.kiro.dev/install | bash"
    exit 1
fi

# Get pending tasks from DynamoDB
echo "📋 Fetching pending tasks..."
TASKS=$(AWS_PROFILE=myaws aws dynamodb scan \
    --table-name aipm-amazon-q-queue \
    --filter-expression "#s = :status" \
    --expression-attribute-names '{"#s":"status"}' \
    --expression-attribute-values '{":status":{"S":"processing"}}' \
    --region us-east-1 \
    --query 'Items[0]' \
    --output json)

if [ "$TASKS" == "null" ] || [ -z "$TASKS" ]; then
    echo "✅ No pending tasks"
    exit 0
fi

# Extract task details
TASK_ID=$(echo "$TASKS" | grep -o '"id":{"S":"[^"]*"' | sed 's/"id":{"S":"//' | sed 's/"//')
TASK_TITLE=$(echo "$TASKS" | grep -o '"title":{"S":"[^"]*"' | sed 's/"title":{"S":"//' | sed 's/"//')
TASK_DETAILS=$(echo "$TASKS" | grep -o '"details":{"S":"[^"]*"' | sed 's/"details":{"S":"//' | sed 's/"//')
BRANCH_NAME=$(echo "$TASKS" | grep -o '"branch":{"S":"[^"]*"' | sed 's/"branch":{"S":"//' | sed 's/"//')

echo ""
echo "📝 Task: $TASK_TITLE"
echo "🌿 Branch: $BRANCH_NAME"
echo ""

# Checkout the branch
echo "🔄 Checking out branch..."
git fetch origin
git checkout "$BRANCH_NAME" || git checkout -b "$BRANCH_NAME" origin/"$BRANCH_NAME"

# Run Amazon Q with full repository context
echo ""
echo "🤖 Running Amazon Q (this may take 2-5 minutes)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

kiro-cli chat --trust-all-tools <<EOF
$TASK_DETAILS

Please implement this feature following the existing code patterns in this repository.
Commit your changes when done.
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if changes were made
if git diff --quiet && git diff --cached --quiet; then
    echo "⚠️  No changes detected"
    echo "❌ Amazon Q may have failed or no changes needed"
    exit 1
fi

# Push changes
echo "📤 Pushing changes..."
git push origin "$BRANCH_NAME"

# Update DynamoDB status
echo "✅ Updating task status..."
AWS_PROFILE=myaws aws dynamodb update-item \
    --table-name aipm-amazon-q-queue \
    --key "{\"id\":{\"S\":\"$TASK_ID\"}}" \
    --update-expression "SET #s = :status" \
    --expression-attribute-names '{"#s":"status"}' \
    --expression-attribute-values '{":status":{"S":"complete"}}' \
    --region us-east-1

echo ""
echo "🎉 Task complete!"
echo "📋 PR: https://github.com/demian7575/aipm/pull/$BRANCH_NAME"
