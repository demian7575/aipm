#!/bin/bash
# Create test-runs DynamoDB tables for both prod and dev

set -e

echo "📦 Creating test-runs DynamoDB tables..."

# Production table
echo "Creating production table: aipm-backend-prod-test-runs"
aws dynamodb create-table \
  --table-name aipm-backend-prod-test-runs \
  --attribute-definitions \
    AttributeName=runId,AttributeType=S \
    AttributeName=storyId,AttributeType=N \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=runId,KeyType=HASH \
    AttributeName=storyId,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=storyId-timestamp-index,KeySchema=[{AttributeName=storyId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1

echo "✅ Production table created"

# Development table
echo "Creating development table: aipm-backend-dev-test-runs"
aws dynamodb create-table \
  --table-name aipm-backend-dev-test-runs \
  --attribute-definitions \
    AttributeName=runId,AttributeType=S \
    AttributeName=storyId,AttributeType=N \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=runId,KeyType=HASH \
    AttributeName=storyId,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=storyId-timestamp-index,KeySchema=[{AttributeName=storyId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1

echo "✅ Development table created"

echo "🎉 All tables created successfully!"
echo ""
echo "Waiting for tables to become ACTIVE..."
aws dynamodb wait table-exists --table-name aipm-backend-prod-test-runs --region us-east-1
aws dynamodb wait table-exists --table-name aipm-backend-dev-test-runs --region us-east-1

echo "✅ Tables are now ACTIVE and ready to use"
