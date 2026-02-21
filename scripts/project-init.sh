#!/bin/bash
set -e

PROJECT_ID=$1
PROJECT_NAME=$2
GITHUB_OWNER=$3
GITHUB_REPO=$4
AWS_REGION=${5:-us-east-1}

if [ -z "$PROJECT_ID" ] || [ -z "$PROJECT_NAME" ] || [ -z "$GITHUB_OWNER" ] || [ -z "$GITHUB_REPO" ]; then
  echo "Usage: $0 <project-id> <project-name> <github-owner> <github-repo> [aws-region]"
  echo "Example: $0 my-app 'My Application' myuser my-app us-east-1"
  exit 1
fi

echo "🚀 Initializing project: $PROJECT_NAME ($PROJECT_ID)"

# Create DynamoDB tables
echo "📦 Creating DynamoDB tables..."

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-stories \
  --attribute-definitions AttributeName=id,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-tests \
  --attribute-definitions \
    AttributeName=id,AttributeType=N \
    AttributeName=storyId,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=storyId-index,KeySchema=[{AttributeName=storyId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-prs \
  --attribute-definitions \
    AttributeName=id,AttributeType=N \
    AttributeName=storyId,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=storyId-index,KeySchema=[{AttributeName=storyId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-test-results \
  --attribute-definitions \
    AttributeName=testId,AttributeType=S \
    AttributeName=runId,AttributeType=S \
  --key-schema \
    AttributeName=testId,KeyType=HASH \
    AttributeName=runId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

# Create S3 bucket
echo "🪣 Creating S3 bucket..."
aws s3 mb s3://${PROJECT_ID}-documents --region $AWS_REGION || echo "Bucket may already exist"

# Register project via API
echo "📝 Registering project..."
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$PROJECT_ID\",
    \"name\": \"$PROJECT_NAME\",
    \"description\": \"\",
    \"github\": {
      \"owner\": \"$GITHUB_OWNER\",
      \"repo\": \"$GITHUB_REPO\",
      \"branch\": \"main\"
    },
    \"aws\": {
      \"region\": \"$AWS_REGION\"
    }
  }"

echo ""
echo "✅ Project initialized successfully!"
echo ""
echo "Next steps:"
echo "1. Clone your project repo: git clone https://github.com/$GITHUB_OWNER/$GITHUB_REPO"
echo "2. Add .aipm/config.yaml to your project"
echo "3. Access AIPM and select '$PROJECT_NAME' from the project dropdown"
