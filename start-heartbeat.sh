#!/bin/bash

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         AIPM Heartbeat Worker - Startup Script            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

# Check kiro-cli
if ! command -v kiro-cli &> /dev/null; then
    echo "❌ kiro-cli not found"
    echo ""
    echo "Install it with:"
    echo "  curl -fsSL https://cli.kiro.dev/install | bash"
    echo ""
    exit 1
fi
echo "✅ kiro-cli installed"

# Check AWS credentials
if ! AWS_PROFILE=myaws aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo ""
    echo "Configure with:"
    echo "  aws configure --profile myaws"
    echo ""
    exit 1
fi
echo "✅ AWS credentials configured"

# Check GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set"
    echo ""
    read -p "Enter your GitHub token: " token
    export GITHUB_TOKEN="$token"
    echo ""
    echo "💡 To make it permanent, add to ~/.bashrc:"
    echo "   echo 'export GITHUB_TOKEN=$token' >> ~/.bashrc"
    echo ""
fi
echo "✅ GitHub token configured"

# Check for pending tasks
echo ""
echo "📋 Checking for pending tasks..."
TASK_COUNT=$(AWS_PROFILE=myaws aws dynamodb scan \
  --table-name aipm-amazon-q-queue \
  --filter-expression "#s = :status1 OR #s = :status2 OR #s = :status3" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":status1":{"S":"pending"},":status2":{"S":"processing"},":status3":{"S":"failed"}}' \
  --region us-east-1 \
  --query 'Count' \
  --output text 2>/dev/null)

echo "Found $TASK_COUNT pending tasks in queue"
echo ""

# Ready to start
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Ready to Start!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "The heartbeat worker will:"
echo "  • Check queue every 1 second"
echo "  • Create branches automatically"
echo "  • Generate code with kiro-cli"
echo "  • Create pull requests"
echo "  • Process all $TASK_COUNT pending tasks"
echo ""
echo "Press Ctrl+C to stop at any time"
echo ""
read -p "Press Enter to start..."

# Start the heartbeat
exec ./heartbeat-worker.sh
