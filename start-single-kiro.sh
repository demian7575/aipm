#!/bin/bash
# Simple persistent Kiro services

# Kill any existing instances
pkill -f kiro-api-server-v3.js
pkill -f kiro-cli

# Start single Kiro API (it will start its own CLI session)
cd /home/ec2-user/aipm
nohup node scripts/kiro-api-server-v3.js > /tmp/kiro.log 2>&1 &

echo "Single Kiro API started"
