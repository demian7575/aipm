#!/bin/bash

# AIPM Multi-Stage Deployment Script
# Deploys to both development and production stages

set -e

STAGE=${1:-prod}
BRANCH=${2:-main}

echo "🚀 Starting AIPM Multi-Stage Deployment..."
echo "Stage: $STAGE"
echo "Branch: $BRANCH"

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

# Checkout specified branch
checkout_branch() {
    if [ "$BRANCH" != "$(git branch --show-current 2>/dev/null || echo 'unknown')" ]; then
        echo "🔄 Switching to branch: $BRANCH"
        
        # Fetch latest changes
        if ! git fetch origin; then
            echo "⚠️ Warning: Failed to fetch from origin, continuing with local branch"
        fi
        
        # Check if branch exists locally
        if git show-ref --verify --quiet refs/heads/$BRANCH; then
            echo "Branch $BRANCH exists locally"
            git checkout $BRANCH
            if git show-ref --verify --quiet refs/remotes/origin/$BRANCH; then
                git pull origin $BRANCH
            fi
        else
            # Branch doesn't exist locally, try to create from remote
            if git show-ref --verify --quiet refs/remotes/origin/$BRANCH; then
                echo "Creating local branch $BRANCH from origin/$BRANCH"
                git checkout -b $BRANCH origin/$BRANCH
            else
                echo "⚠️ Warning: Branch $BRANCH not found, staying on current branch"
                return 0
            fi
        fi
        
        echo "✅ Switched to branch: $BRANCH"
    else
        echo "✅ Already on branch: $BRANCH"
        # Still pull latest changes if on the target branch
        if git show-ref --verify --quiet refs/remotes/origin/$BRANCH; then
            git pull origin $BRANCH 2>/dev/null || echo "⚠️ Warning: Could not pull latest changes"
        fi
    fi
}
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
    npm install --legacy-peer-deps
    
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
    echo "☁️ Deploying backend services to $STAGE stage..."
    
    # Deploy using Serverless Framework with stage parameter
    serverless deploy --stage $STAGE --verbose
    
    # Get the API endpoint
    API_ENDPOINT=$(serverless info --stage $STAGE --verbose | grep -o 'https://[^[:space:]]*' | head -1 | sed 's/{proxy+}//')
    echo "✅ Backend deployed to: $API_ENDPOINT"
    
    # Update frontend config with API endpoint
    echo "window.__AIPM_API_BASE__ = '$API_ENDPOINT';" > apps/frontend/public/config.js
    echo "Updated frontend config with API endpoint: $API_ENDPOINT"
    
    # Export API endpoint for frontend deployment
    export API_ENDPOINT
}

# Migrate data between environments
migrate_data() {
    local source_stage=$1
    local target_stage=$2
    
    echo "🔄 Migrating data from $source_stage to $target_stage..."
    
    if [ -f "scripts/migrate-data.js" ]; then
        node scripts/migrate-data.js $source_stage $target_stage
        if [ $? -eq 0 ]; then
            echo "✅ Data migration completed"
        else
            echo "⚠️ Data migration failed, continuing with deployment"
        fi
    else
        echo "⚠️ Migration script not found, skipping data migration"
    fi
}

# Run gating tests
run_gating_tests() {
    echo "🧪 Running deployment gating tests..."
    
    # Wait a moment for deployment to stabilize
    echo "⏳ Waiting 30 seconds for deployment to stabilize..."
    sleep 30
    
    if [ "$STAGE" = "dev" ]; then
        npm run gating:dev
    elif [ "$STAGE" = "prod" ]; then
        npm run gating:prod
    elif [ "$STAGE" = "all" ]; then
        npm run gating:all
    fi
    
    echo "✅ Gating tests passed!"
}
    echo "🌐 Deploying frontend to $STAGE stage..."
    
    BUCKET_NAME="aipm-${STAGE}-frontend-hosting"
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

# Deploy both stages
deploy_all_stages() {
    echo "🎯 Deploying to both development and production stages"
    echo "================================"
    
    checkout_branch
    
    # Deploy development stage
    echo "🔧 Deploying DEVELOPMENT stage..."
    STAGE=dev
    
    # Migrate current data to dev environment
    migrate_data prod dev
    
    deploy_backend
    deploy_frontend
    DEV_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
    
    echo ""
    echo "🔧 Development deployment complete!"
    echo "Frontend: $DEV_URL"
    echo ""
    
    # Deploy production stage
    echo "🚀 Deploying PRODUCTION stage..."
    STAGE=prod
    deploy_backend
    deploy_frontend
    PROD_URL="http://aipm-prod-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
    
    echo ""
    echo "🚀 Production deployment complete!"
    echo "Frontend: $PROD_URL"
    echo ""
    
    echo "🎉 All deployments complete!"
    echo "================================"
    echo "Development: $DEV_URL"
    echo "Production: $PROD_URL"
    echo ""
    
    # Run comprehensive gating tests
    echo "🧪 Running comprehensive gating tests..."
    run_gating_tests
}

# Main deployment function
main() {
    check_prerequisites
    checkout_branch
    install_dependencies
    build_app
    
    if [ "$STAGE" = "all" ]; then
        deploy_all_stages
    else
        deploy_backend
        deploy_frontend
        run_gating_tests
        
        WEBSITE_URL="http://aipm-${STAGE}-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
        echo ""
        echo "🎉 Deployment Complete!"
        echo "================================"
        echo "Stage: $STAGE"
        echo "Frontend: $WEBSITE_URL"
        echo "Backend API: Check serverless output above"
        echo ""
        echo "Your AIPM web service is now live! 🚀"
    fi
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [STAGE] [BRANCH]"
    echo ""
    echo "STAGE options:"
    echo "  dev     - Deploy to development stage"
    echo "  prod    - Deploy to production stage (default)"
    echo "  all     - Deploy to both dev and prod stages"
    echo ""
    echo "BRANCH options:"
    echo "  main         - Deploy from main branch (default)"
    echo "  development  - Deploy from development branch"
    echo ""
    echo "Examples:"
    echo "  $0 dev development    # Deploy dev stage from development branch"
    echo "  $0 prod main         # Deploy prod stage from main branch"
    echo "  $0 all               # Deploy both stages"
    exit 0
fi

# Run main function
main "$@"
