#!/bin/bash
set -e

echo "🚀 AIPM AWS Deployment Script"
echo "=============================="

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure'."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build application
echo "📦 Building application..."
npm run build

# Deploy using serverless framework
echo "🚀 Deploying to AWS..."
npx serverless deploy

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your AIPM service is now live!"
echo "📱 Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "🔗 Check serverless output above for API Gateway URL"
