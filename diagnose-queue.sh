#!/bin/bash
# Diagnose DynamoDB Queue Corruption

TABLE_NAME="aipm-amazon-q-queue"
REGION="us-east-1"

echo "🔍 Diagnosing DynamoDB Queue: $TABLE_NAME"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
  echo "❌ AWS credentials invalid - run: aws configure"
  exit 1
fi

# Get all items
echo "📊 Fetching all queue items..."
ITEMS=$(aws dynamodb scan \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --output json 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to scan table:"
  echo "$ITEMS"
  exit 1
fi

# Count items
TOTAL=$(echo "$ITEMS" | jq '.Items | length')
echo "Total items: $TOTAL"
echo ""

# Check for null taskId/taskDescription
echo "🔍 Checking for data corruption..."
NULL_TASK_ID=$(echo "$ITEMS" | jq '[.Items[] | select(.taskId == null or .taskId.S == null or .taskId.S == "")] | length')
NULL_TASK_DESC=$(echo "$ITEMS" | jq '[.Items[] | select(.taskDescription == null or .taskDescription.S == null or .taskDescription.S == "")] | length')

echo "Items with null/empty taskId: $NULL_TASK_ID"
echo "Items with null/empty taskDescription: $NULL_TASK_DESC"
echo ""

# Show sample corrupted item
if [ "$NULL_TASK_ID" -gt 0 ]; then
  echo "📋 Sample corrupted item:"
  echo "$ITEMS" | jq '.Items[] | select(.taskId == null or .taskId.S == null or .taskId.S == "") | {id: .id.S, status: .status.S, taskId: .taskId, taskDescription: .taskDescription}' | head -20
  echo ""
fi

# Show all item IDs and status
echo "📋 All queue items:"
echo "$ITEMS" | jq -r '.Items[] | "\(.id.S) | \(.status.S) | taskId: \(.taskId.S // "null") | desc: \(.taskDescription.S // "null" | .[0:50])"'
echo ""

# Check table schema
echo "🏗️ Table schema:"
aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --query 'Table.{KeySchema:KeySchema,AttributeDefinitions:AttributeDefinitions}' \
  --output json 2>&1 | jq '.'
