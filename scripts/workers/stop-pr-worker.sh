#!/bin/bash

# Stop PR Processor Worker

echo "🛑 Stopping PR Processor Worker..."

if pgrep -f "pr-processor-worker.sh" > /dev/null; then
    pkill -f "pr-processor-worker.sh"
    echo "✅ PR Processor Worker stopped"
else
    echo "ℹ️  PR Processor Worker is not running"
fi
