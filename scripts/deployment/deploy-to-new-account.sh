#!/bin/bash
# Deploy AIPM to a new AWS account

set -e

ACCOUNT_ID="${1:-701490494964}"
REGION="${2:-us-east-1}"
PROFILE_NAME="aipm-${ACCOUNT_ID}"

echo "🚀 Deploying AIPM to AWS Account: $ACCOUNT_ID"
echo "📍 Region: $REGION"
echo ""

# Check if profile exists
if ! aws configure list-profiles | grep -q "^${PROFILE_NAME}$"; then
    echo "⚙️  Setting up AWS profile: $PROFILE_NAME"
    echo ""
    echo "Please enter your AWS credentials for account $ACCOUNT_ID:"
    aws configure --profile $PROFILE_NAME
else
    echo "✅ Using existing profile: $PROFILE_NAME"
fi

echo ""
echo "📦 Starting deployment..."
echo ""

# Export profile for deployment
export AWS_PROFILE=$PROFILE_NAME
export AWS_DEFAULT_REGION=$REGION

# Deploy backend
echo "🔧 Deploying backend (Lambda + API Gateway + DynamoDB)..."
npx serverless deploy --stage prod --region $REGION

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name aipm-backend-prod \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceEndpoint`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
    API_ENDPOINT=$(npx serverless info --stage prod --region $REGION | grep "endpoint:" | awk '{print $2}')
fi

echo "✅ Backend deployed: $API_ENDPOINT"

# Create S3 bucket for frontend
BUCKET_NAME="aipm-frontend-${ACCOUNT_ID}"
echo ""
echo "📦 Creating S3 bucket: $BUCKET_NAME"

aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || echo "Bucket already exists"

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
    --index-document index.html \
    --error-document index.html \
    --region $REGION

# Make bucket public
aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Sid\": \"PublicReadGetObject\",
            \"Effect\": \"Allow\",
            \"Principal\": \"*\",
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::${BUCKET_NAME}/*\"
        }]
    }" \
    --region $REGION

# Generate frontend config
echo ""
echo "📝 Generating frontend configuration..."
cat > apps/frontend/public/config.js << EOF
// AIPM Frontend Configuration - Account $ACCOUNT_ID
window.CONFIG = {
    API_BASE_URL: '${API_ENDPOINT}',
    EC2_TERMINAL_URL: 'wss://44.220.45.57:8443',
    ENVIRONMENT: 'production',
    DEBUG: false
};
EOF

# Deploy frontend
echo "📤 Deploying frontend to S3..."
aws s3 sync apps/frontend/public/ s3://$BUCKET_NAME/ \
    --region $REGION \
    --exclude "*.md" \
    --cache-control "no-cache, must-revalidate" \
    --delete

FRONTEND_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 AIPM DEPLOYED TO ACCOUNT $ACCOUNT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources:"
echo "  • Account:   $ACCOUNT_ID"
echo "  • Region:    $REGION"
echo "  • Frontend:  $FRONTEND_URL"
echo "  • Backend:   $API_ENDPOINT"
echo "  • Lambda:    aipm-backend-prod-api"
echo "  • Stories:   aipm-backend-prod-stories"
echo "  • Tests:     aipm-backend-prod-acceptance-tests"
echo ""
echo "🌐 Access your AIPM instance at:"
echo "   $FRONTEND_URL"
echo ""
