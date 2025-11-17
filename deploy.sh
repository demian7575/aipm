#!/bin/bash

# AIPM One-Command Deployment Script
# Deploys both frontend and backend to AWS

set -e

echo "🚀 Starting AIPM Web Service Deployment..."

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not found. Please install: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install
    
    # Install serverless globally if not present
    if ! command -v serverless &> /dev/null; then
        echo "Installing Serverless Framework..."
        npm install -g serverless
    fi
    
    echo "✅ Dependencies installed"
}

# Build the application
build_app() {
    echo "🔨 Building application..."
    npm run build
    echo "✅ Build completed"
}

# Deploy backend services
deploy_backend() {
    echo "☁️ Deploying backend services..."
    
    # Deploy using Serverless Framework
    serverless deploy --verbose
    
    # Get the API endpoint
    API_ENDPOINT=$(serverless info --verbose | grep -o 'https://[^[:space:]]*' | head -1)
    echo "✅ Backend deployed to: $API_ENDPOINT"
    
    # Update frontend config with API endpoint
    echo "window.__AIPM_API_BASE__ = '$API_ENDPOINT';" > apps/frontend/public/config.js
    echo "Updated frontend config with API endpoint: $API_ENDPOINT"
}

# Deploy frontend to S3
deploy_frontend() {
    echo "🌐 Deploying frontend..."
    
    BUCKET_NAME="aipm-static-hosting-demo"
    REGION="us-east-1"
    
    # Create S3 bucket if it doesn't exist
    if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
        echo "Creating S3 bucket: $BUCKET_NAME"
        aws s3 mb "s3://$BUCKET_NAME" --region $REGION
        
        # Configure bucket for static website hosting
        aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document error.html
        
        # Set bucket policy for public read access
        cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
        aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
        rm bucket-policy.json
    fi
    
    # Sync dist folder to S3
    aws s3 sync dist/ "s3://$BUCKET_NAME" --delete
    
    WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
    echo "✅ Frontend deployed to: $WEBSITE_URL"
}

# Main deployment function
main() {
    echo "🎯 AIPM Web Service Deployment"
    echo "================================"
    
    check_prerequisites
    install_dependencies
    build_app
    deploy_backend
    deploy_frontend
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "================================"
    echo "Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
    echo "Backend API: Check serverless output above"
    echo ""
    echo "Your AIPM web service is now live! 🚀"
}

# Run main function
main "$@"
