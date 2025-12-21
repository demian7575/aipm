#!/bin/bash

echo "=== KIRO CLI STREAMING LOGS ==="
echo "Starting at $(date)"
echo

# Stream logs with filtering for readable content
ssh -o ConnectTimeout=5 ec2-user@44.220.45.57 "
    sudo journalctl -u kiro-api-v3 -f --no-pager | while read line; do
        # Filter out binary blob data and show only meaningful logs
        if [[ \$line != *'blob data'* ]]; then
            echo \"\$(date '+%H:%M:%S') \$line\"
        fi
    done
" 2>/dev/null
