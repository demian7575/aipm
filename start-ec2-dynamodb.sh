#!/bin/bash

# Set environment variables for DynamoDB usage
export NODE_ENV=production
export STORIES_TABLE=aipm-backend-prod-stories
export AWS_REGION=us-east-1

# Start the EC2 backend with DynamoDB
echo "Starting AIPM EC2 backend with DynamoDB..."
node apps/backend/server.js
