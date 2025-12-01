#!/bin/bash
set -e

echo "🧪 Testing Heartbeat Worker Logic"
echo "=================================="
echo ""

# Check prerequisites
if ! command -v kiro-cli &> /dev/null; then
    echo "❌ kiro-cli not installed"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set"
    echo "   Run: export GITHUB_TOKEN=your_token"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# Check for pending tasks
echo "📋 Checking for pending tasks..."
TASK_COUNT=$(AWS_PROFILE=myaws aws dynamodb scan \
  --table-name aipm-amazon-q-queue \
  --filter-expression "#s = :status1 OR #s = :status2" \
  --expression-attribute-names '{"#s":"status"}' \
  --expression-attribute-values '{":status1":{"S":"processing"},":status2":{"S":"failed"}}' \
  --region us-east-1 \
  --query 'Count' \
  --output text 2>/dev/null)

echo "Found $TASK_COUNT pending tasks"
echo ""

if [ "$TASK_COUNT" -eq 0 ]; then
    echo "✅ No tasks to process"
    echo ""
    echo "To test:"
    echo "1. Go to AIPM web UI"
    echo "2. Click 'Generate Code & PR'"
    echo "3. Fill in the form and submit"
    echo "4. Run this script again"
    exit 0
fi

echo "🚀 Ready to process tasks!"
echo ""
echo "To start the heartbeat worker:"
echo "  export GITHUB_TOKEN=your_token"
echo "  ./heartbeat-worker.sh"
echo ""
echo "Or process one task now? (y/n)"
read -r answer

if [ "$answer" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

# Process one task
echo ""
echo "Processing one task..."
./heartbeat-worker.sh &
WORKER_PID=$!

# Wait 10 seconds then stop
sleep 10
kill $WORKER_PID 2>/dev/null || true

echo ""
echo "✅ Test complete!"
