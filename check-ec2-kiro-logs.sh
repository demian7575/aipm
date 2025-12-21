#!/bin/bash

echo "=== Checking EC2 Kiro CLI Logs ==="
echo

# Method 1: Check via terminal service
echo "1. Checking Kiro processes on EC2..."
curl -s "http://44.220.45.57:8080/execute" \
  -H "Content-Type: application/json" \
  -d '{"command": "ps aux | grep kiro | grep -v grep"}' | jq -r '.output // "No output"'

echo
echo "2. Checking systemd service logs..."
curl -s "http://44.220.45.57:8080/execute" \
  -H "Content-Type: application/json" \
  -d '{"command": "sudo journalctl -u kiro-api --no-pager -n 20"}' | jq -r '.output // "No output"'

echo
echo "3. Checking for log files..."
curl -s "http://44.220.45.57:8080/execute" \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/log /tmp -name \"*kiro*\" -type f 2>/dev/null"}' | jq -r '.output // "No output"'

echo
echo "4. Testing API server response..."
curl -s "http://44.220.45.57:8081/kiro/v3/transform" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"contract": "enhance-story-v1", "input": {"idea": "test", "parentId": null}}' \
  -w "\nHTTP_CODE:%{http_code}\n"

echo
echo "=== Use these commands in AIPM Terminal ==="
echo "1. Open AIPM → Click 'Open Kiro Terminal'"
echo "2. Run: ps aux | grep kiro"
echo "3. Run: sudo journalctl -u kiro-api --no-pager -n 50"
echo "4. Run: tail -f /var/log/kiro-api.log"
