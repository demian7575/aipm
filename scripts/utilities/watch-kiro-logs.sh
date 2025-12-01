#!/bin/bash
# Watch Kiro terminal server logs in real-time

EC2_IP="44.220.45.57"
REPO_PATH="/home/ec2-user/aipm"

echo "📺 Watching Kiro terminal server logs on EC2..."
echo "📁 Location: $REPO_PATH/scripts/workers/terminal-server.log"
echo "Press Ctrl+C to stop"
echo ""

ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "tail -f $REPO_PATH/scripts/workers/terminal-server.log"

