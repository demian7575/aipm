#!/bin/bash
# Restart Amazon Q Heartbeat Worker with proper logging

LOG_DIR="/tmp/aipm-worker"
LOG_FILE="$LOG_DIR/heartbeat-worker.log"
PID_FILE="$LOG_DIR/heartbeat-worker.pid"

mkdir -p "$LOG_DIR"

# Kill existing workers
echo "🛑 Stopping existing workers..."
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null && echo "  Killed PID $OLD_PID"
fi

# Clean lock files
rm -f /repo/ebaejun/tools/aws/aipm/.queue/heartbeat.lock
rm -f "$PID_FILE"

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null; then
  echo "❌ AWS credentials invalid or expired"
  echo "   Run: aws configure"
  exit 1
fi
echo "✅ AWS credentials valid"

# Start heartbeat worker
echo "🫀 Starting heartbeat worker..."
cd /repo/ebaejun/tools/aws/aipm

nohup ./amazon-q-heartbeat.sh > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

sleep 2

if ps -p $NEW_PID > /dev/null; then
  echo "✅ Heartbeat worker started (PID: $NEW_PID)"
  echo "📋 Log file: $LOG_FILE"
  echo ""
  echo "Monitor with: tail -f $LOG_FILE"
  echo "Stop with: kill $NEW_PID"
else
  echo "❌ Failed to start worker"
  cat "$LOG_FILE"
  exit 1
fi
