#!/bin/bash

# Monitor idle time and stop EC2 after 30 minutes
IDLE_THRESHOLD=1800  # 30 minutes
POOL_URL="http://localhost:8082/health"
STATE_FILE="/tmp/ec2-idle-state"

# Initialize state file if doesn't exist
if [ ! -f "$STATE_FILE" ]; then
    echo "0" > "$STATE_FILE"
fi

# Check if pool is busy
response=$(curl -s $POOL_URL 2>/dev/null)
busy=$(echo "$response" | jq -r '.busy // 0' 2>/dev/null)
queue=$(echo "$response" | jq -r '.queueLength // 0' 2>/dev/null)

if [ "$busy" -gt 0 ] || [ "$queue" -gt 0 ]; then
    # Active - reset idle counter
    echo "0" > "$STATE_FILE"
    echo "$(date): Active (busy=$busy, queue=$queue)"
else
    # Idle - increment counter
    idle_time=$(cat "$STATE_FILE")
    idle_time=$((idle_time + 60))  # Add 1 minute
    echo "$idle_time" > "$STATE_FILE"
    
    echo "$(date): Idle for $idle_time seconds"
    
    if [ $idle_time -ge $IDLE_THRESHOLD ]; then
        echo "$(date): Idle threshold reached, stopping instance..."
        sudo shutdown -h now
    fi
fi
