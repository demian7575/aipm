#!/bin/bash
set -e

echo "🚀 Deploying complete DEV environment (bypassing CloudFormation)..."
echo "================================================"

REGION="us-east-1"
STAGE="dev"
FUNCTION_NAME="aipm-backend-dev-api"
API_NAME="dev-aipm-backend"

# Step 1: Ensure DynamoDB tables exist
echo "📊 Step 1: Checking DynamoDB tables..."
for TABLE in "aipm-backend-dev-stories" "aipm-backend-dev-acceptance-tests"; do
  if aws dynamodb describe-table --table-name $TABLE --region $REGION 2>/dev/null; then
    echo "  ✅ Table exists: $TABLE"
  else
    echo "  📝 Creating table: $TABLE"
    if [[ $TABLE == *"stories"* ]]; then
      aws dynamodb create-table \
        --table-name $TABLE \
        --attribute-definitions AttributeName=id,AttributeType=N \
        --key-schema AttributeName=id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION
    else
      aws dynamodb create-table \
        --table-name $TABLE \
        --attribute-definitions \
          AttributeName=id,AttributeType=N \
          AttributeName=storyId,AttributeType=N \
        --key-schema AttributeName=id,KeyType=HASH \
        --global-secondary-indexes \
          "IndexName=storyId-index,KeySchema=[{AttributeName=storyId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION
    fi
    echo "  ⏳ Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name $TABLE --region $REGION
    echo "  ✅ Table created: $TABLE"
  fi
done

# Step 2: Package Lambda function
echo ""
echo "📦 Step 2: Packaging Lambda function..."
cd "$(dirname "$0")/../.."
npx serverless package --stage dev

# Step 3: Upload to S3
echo ""
echo "☁️  Step 3: Uploading package to S3..."
S3_BUCKET="aipm-dev-frontend-hosting"
S3_KEY="lambda/aipm-backend-dev.zip"
aws s3 cp .serverless/aipm-backend.zip s3://$S3_BUCKET/$S3_KEY

# Step 4: Create or update Lambda function
echo ""
echo "⚡ Step 4: Deploying Lambda function..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "  📝 Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --s3-bucket $S3_BUCKET \
    --s3-key $S3_KEY \
    --region $REGION
  
  echo "  ⏳ Waiting for update to complete..."
  aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
  
  echo "  📝 Updating function configuration..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --handler apps/backend/handler.handler \
    --runtime nodejs18.x \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={
      NODE_ENV=production,
      STAGE=dev,
      STORIES_TABLE=aipm-backend-dev-stories,
      ACCEPTANCE_TESTS_TABLE=aipm-backend-dev-acceptance-tests,
      GITHUB_TOKEN=${GITHUB_TOKEN:-},
      GITHUB_OWNER=demian7575,
      GITHUB_REPO=aipm
    }" \
    --region $REGION
else
  echo "  📝 Creating new Lambda function..."
  
  # Get or create IAM role
  ROLE_NAME="aipm-backend-dev-lambda-role"
  if aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
  else
    echo "  📝 Creating IAM role..."
    ROLE_ARN=$(aws iam create-role \
      --role-name $ROLE_NAME \
      --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Principal": {"Service": "lambda.amazonaws.com"},
          "Action": "sts:AssumeRole"
        }]
      }' \
      --query 'Role.Arn' \
      --output text)
    
    # Attach policies
    aws iam attach-role-policy \
      --role-name $ROLE_NAME \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    aws iam put-role-policy \
      --role-name $ROLE_NAME \
      --policy-name dynamodb-access \
      --policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": [
            "dynamodb:Query",
            "dynamodb:Scan",
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          "Resource": [
            "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-dev-*",
            "arn:aws:dynamodb:us-east-1:*:table/aipm-amazon-q-queue"
          ]
        }]
      }'
    
    echo "  ⏳ Waiting for IAM role to propagate..."
    sleep 10
  fi
  
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler apps/backend/handler.handler \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={
      NODE_ENV=production,
      STAGE=dev,
      STORIES_TABLE=aipm-backend-dev-stories,
      ACCEPTANCE_TESTS_TABLE=aipm-backend-dev-acceptance-tests,
      GITHUB_TOKEN=${GITHUB_TOKEN:-},
      GITHUB_OWNER=demian7575,
      GITHUB_REPO=aipm
    }" \
    --code S3Bucket=$S3_BUCKET,S3Key=$S3_KEY \
    --region $REGION
fi

echo "  ✅ Lambda function deployed"

# Step 5: Create or update API Gateway
echo ""
echo "🌐 Step 5: Setting up API Gateway..."

# Check if API exists
API_ID=$(aws apigateway get-rest-apis --region $REGION --query "items[?name=='$API_NAME'].id" --output text)

if [ -z "$API_ID" ]; then
  echo "  📝 Creating new API Gateway..."
  API_ID=$(aws apigateway create-rest-api \
    --name $API_NAME \
    --description "AIPM Development API" \
    --endpoint-configuration types=REGIONAL \
    --region $REGION \
    --query 'id' \
    --output text)
  
  # Get root resource
  ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/`].id' --output text)
  
  # Create {proxy+} resource
  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part '{proxy+}' \
    --region $REGION \
    --query 'id' \
    --output text)
  
  # Create ANY method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method ANY \
    --authorization-type NONE \
    --region $REGION
  
  # Get Lambda ARN
  LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  
  # Set Lambda integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION
  
  # Add Lambda permission
  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-dev \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" \
    --region $REGION 2>/dev/null || true
  
  # Deploy API
  aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name dev \
    --region $REGION
  
  echo "  ✅ API Gateway created"
else
  echo "  ✅ API Gateway exists: $API_ID"
fi

API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/dev"

# Step 6: Deploy frontend
echo ""
echo "🎨 Step 6: Deploying frontend..."

# Create config.js
cat > apps/frontend/public/config.js << EOF
window.CONFIG = {
  API_BASE_URL: '$API_ENDPOINT',
  apiEndpoint: '$API_ENDPOINT',
  ENVIRONMENT: 'development',
  environment: 'development',
  stage: 'dev',
  region: '$REGION',
  storiesTable: 'aipm-backend-dev-stories',
  acceptanceTestsTable: 'aipm-backend-dev-acceptance-tests',
  DEBUG: true
};
EOF

# Deploy to S3
aws s3 sync apps/frontend/public/ s3://$S3_BUCKET --delete --cache-control no-cache

echo ""
echo "✅ Development environment deployed successfully!"
echo "================================================"
echo "📍 API Endpoint: $API_ENDPOINT"
echo "🌐 Frontend URL: http://$S3_BUCKET.s3-website-$REGION.amazonaws.com"
echo ""
echo "🧪 Test the API:"
echo "   curl $API_ENDPOINT/api/stories"
