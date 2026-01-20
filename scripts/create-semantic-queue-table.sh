#!/bin/bash
set -e

TABLE_NAME="${SEMANTIC_QUEUE_TABLE:-aipm-semantic-api-queue}"
REGION="${AWS_REGION:-us-east-1}"

echo "🗄️  Creating DynamoDB table: $TABLE_NAME"

aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" \
  2>/dev/null || echo "⚠️  Table may already exist"

echo "✅ Table created/verified: $TABLE_NAME"
