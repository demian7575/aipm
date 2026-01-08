#!/bin/bash
# True file copy approach

set -e
echo "📁 File copy..."

REGION="us-east-1"

# Just copy the JSON files
echo "📋 Copying Stories..."
aws dynamodb scan --table-name "aipm-backend-prod-stories" --region "$REGION" > stories.json

echo "📋 Copying Tests..."  
aws dynamodb scan --table-name "aipm-backend-prod-acceptance-tests" --region "$REGION" > tests.json

echo "📋 Copying PRs..."
aws dynamodb scan --table-name "aipm-backend-prod-prs" --region "$REGION" > prs.json

echo "✅ Files copied!"
echo "📁 stories.json ($(du -h stories.json | cut -f1))"
echo "📁 tests.json ($(du -h tests.json | cut -f1))"  
echo "📁 prs.json ($(du -h prs.json | cut -f1))"
