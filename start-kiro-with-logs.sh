#!/bin/bash

# Enhanced Kiro API Server with comprehensive logging
cd /home/ec2-user/aipm

# Create log directory
mkdir -p /home/ec2-user/logs

# Start Kiro API server with full logging
exec node scripts/kiro-api-server-v3.js \
  > /home/ec2-user/logs/kiro-api-combined.log 2>&1
