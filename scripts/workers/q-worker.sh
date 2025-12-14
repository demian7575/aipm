#!/bin/bash

# Q Worker - Polling-based worker implementation for GitHub file test
# This script provides a basic worker implementation for testing purposes

set -e

echo "Q Worker starting..."

# Configuration
POLL_INTERVAL=${POLL_INTERVAL:-5}
MAX_ITERATIONS=${MAX_ITERATIONS:-10}

# Worker main loop
iteration=0
while [ $iteration -lt $MAX_ITERATIONS ]; do
    echo "Worker iteration $((iteration + 1))/$MAX_ITERATIONS"
    
    # Simulate polling for tasks
    echo "Polling for tasks..."
    
    # Simulate task processing
    sleep $POLL_INTERVAL
    
    iteration=$((iteration + 1))
done

echo "Q Worker completed $MAX_ITERATIONS iterations"
