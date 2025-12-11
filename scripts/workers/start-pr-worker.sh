#!/bin/bash

# Start PR Processor Worker
# This script starts the worker that processes code generation requests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_SCRIPT="$SCRIPT_DIR/pr-processor-worker.sh"

echo "🚀 Starting PR Processor Worker..."

# Check if worker script exists
if [ ! -f "$WORKER_SCRIPT" ]; then
    echo "❌ Worker script not found: $WORKER_SCRIPT"
    exit 1
fi

# Check if already running
if pgrep -f "pr-processor-worker.sh" > /dev/null; then
    echo "⚠️  PR Processor Worker is already running"
    echo "   PID: $(pgrep -f "pr-processor-worker.sh")"
    exit 0
fi

# Start worker in background
echo "🔄 Starting worker process..."
nohup "$WORKER_SCRIPT" > /dev/null 2>&1 &
WORKER_PID=$!

echo "✅ PR Processor Worker started"
echo "   PID: $WORKER_PID"
echo "   Log: $(dirname "$SCRIPT_DIR")/logs/pr-worker.log"
echo ""
echo "To stop the worker, run:"
echo "   pkill -f pr-processor-worker.sh"
echo ""
echo "To view logs, run:"
echo "   tail -f $(dirname "$SCRIPT_DIR")/logs/pr-worker.log"
