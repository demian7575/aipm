#!/bin/bash

echo "=== REAL-TIME KIRO ENHANCE-STORY MONITORING ==="
echo "Starting monitoring at $(date)"
echo

# Function to monitor logs
monitor_logs() {
    ssh -o ConnectTimeout=5 ec2-user@44.220.45.57 "
        echo '=== Current Status ==='
        curl -s http://localhost:8081/health | jq -r '.activeRequests, .queuedRequests'
        
        echo '=== Recent Logs (last 20 lines) ==='
        sudo journalctl -u kiro-api-v3 --no-pager -n 20 | tail -10
        
        echo '=== Kiro CLI Process Status ==='
        ps aux | grep kiro-cli | grep -v grep
    " 2>/dev/null
}

# Function to test enhance-story
test_enhance_story() {
    echo "=== Starting enhance-story test ==="
    curl -v -X POST http://44.220.45.57:8081/kiro/enhance-story \
      -H "Content-Type: application/json" \
      -d '{"idea": "simple test", "parentId": null}' \
      --max-time 180 &
    
    local curl_pid=$!
    echo "Started curl with PID: $curl_pid"
    
    # Monitor for 3 minutes
    for i in {1..18}; do
        echo
        echo "=== Monitor Check $i ($(date)) ==="
        monitor_logs
        sleep 10
    done
    
    # Kill curl if still running
    kill $curl_pid 2>/dev/null
    wait $curl_pid 2>/dev/null
}

# Run the test
test_enhance_story
