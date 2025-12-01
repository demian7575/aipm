#!/bin/bash
# Watch Kiro terminal server logs in real-time

EC2_IP="44.220.45.57"

echo "📺 Watching Kiro terminal server logs on EC2..."
echo "Press Ctrl+C to stop"
echo ""

ssh -o StrictHostKeyChecking=no ec2-user@$EC2_IP "tail -f terminal-server.log"
