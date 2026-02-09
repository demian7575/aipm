#!/bin/bash
# Kiro Session Pool Health Check & Recovery Script

LOCK_FILE="/tmp/kiro-session-pool.lock"
PID_FILE="/tmp/kiro-session-pool.pid"
POOL_PORT=8082

echo "🔍 Kiro Session Pool Health Check"
echo "=================================="

# Check if lock file exists
if [ ! -f "$LOCK_FILE" ]; then
    echo "❌ Session pool is NOT running (no lock file)"
    exit 1
fi

# Get PID from lock file
if [ ! -f "$PID_FILE" ]; then
    echo "❌ PID file missing"
    exit 1
fi

PID=$(cat "$PID_FILE")
echo "📋 PID: $PID"

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "❌ Process $PID is NOT running (stale lock file)"
    echo "🧹 Cleaning up stale lock files..."
    rm -f "$LOCK_FILE" "$PID_FILE"
    exit 1
fi

echo "✅ Process is running"

# Check CPU and memory usage
CPU=$(ps -p "$PID" -o %cpu= | tr -d ' ')
MEM=$(ps -p "$PID" -o %mem= | tr -d ' ')
echo "💻 CPU: ${CPU}%"
echo "🧠 Memory: ${MEM}%"

# Check if port is listening
if lsof -i :$POOL_PORT > /dev/null 2>&1; then
    echo "✅ Port $POOL_PORT is listening"
else
    echo "❌ Port $POOL_PORT is NOT listening"
    exit 1
fi

# Check HTTP health endpoint
HEALTH=$(curl -s --connect-timeout 5 http://localhost:$POOL_PORT/health 2>&1)
if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    AVAILABLE=$(echo "$HEALTH" | jq -r '.available')
    BUSY=$(echo "$HEALTH" | jq -r '.busy')
    STUCK=$(echo "$HEALTH" | jq -r '.stuck')
    echo "✅ Health endpoint responding"
    echo "   Available: $AVAILABLE"
    echo "   Busy: $BUSY"
    echo "   Stuck: $STUCK"
    
    if [ "$STUCK" -gt 0 ]; then
        echo "⚠️  WARNING: $STUCK stuck sessions detected"
    fi
else
    echo "❌ Health endpoint not responding properly"
    exit 1
fi

# Count kiro-cli processes
KIRO_COUNT=$(ps aux | grep "kiro-cli chat" | grep -v grep | wc -l)
echo "🔢 Kiro CLI processes: $KIRO_COUNT"

if [ "$KIRO_COUNT" -gt 10 ]; then
    echo "⚠️  WARNING: Too many kiro-cli processes ($KIRO_COUNT)"
    echo "   Expected: 2-4 processes"
fi

echo ""
echo "=================================="
echo "✅ Session pool is healthy"
