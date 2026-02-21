#!/bin/bash
set -e

PROJECT_ID=$1
CONFIRM=$2

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <project-id> [--confirm]"
  exit 1
fi

if [ "$CONFIRM" != "--confirm" ]; then
  echo "⚠️  WARNING: This will delete all AWS resources for project '$PROJECT_ID'"
  echo ""
  echo "This includes:"
  echo "  - DynamoDB tables (stories, tests, prs, results)"
  echo "  - S3 bucket (documents)"
  echo "  - Project registry entry"
  echo ""
  echo "To proceed, run: $0 $PROJECT_ID --confirm"
  exit 1
fi

echo "🗑️  Deleting project: $PROJECT_ID"

# Delete DynamoDB tables
echo "📦 Deleting DynamoDB tables..."
aws dynamodb delete-table --table-name ${PROJECT_ID}-stories || true
aws dynamodb delete-table --table-name ${PROJECT_ID}-tests || true
aws dynamodb delete-table --table-name ${PROJECT_ID}-prs || true
aws dynamodb delete-table --table-name ${PROJECT_ID}-test-results || true

# Delete S3 bucket (empty first)
echo "🪣 Deleting S3 bucket..."
aws s3 rm s3://${PROJECT_ID}-documents --recursive || true
aws s3 rb s3://${PROJECT_ID}-documents || true

# Unregister project
echo "📝 Unregistering project..."
curl -X DELETE http://localhost:4000/api/projects/$PROJECT_ID

echo ""
echo "✅ Project deleted successfully!"
