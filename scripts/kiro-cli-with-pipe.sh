#!/bin/bash
# Kiro CLI with Named Pipe Input

PIPE_PATH="/tmp/kiro_input"
LOG_FILE="/tmp/kiro-cli-live.log"
ERROR_LOG="/tmp/kiro-cli-error.log"

# Create named pipe if it doesn't exist
if [ ! -p "$PIPE_PATH" ]; then
    echo "Creating named pipe: $PIPE_PATH"
    mkfifo "$PIPE_PATH"
fi

# Start timestamp
echo "" >> "$LOG_FILE"
echo "=== Kiro CLI Session Started: $(date -Iseconds) ===" >> "$LOG_FILE"

# Start Kiro CLI with pipe input
tail -f "$PIPE_PATH" | kiro-cli chat --trust-all-tools 2>&1 | tee -a "$LOG_FILE"
