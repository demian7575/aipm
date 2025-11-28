#!/bin/bash
set -e

echo "🔧 Preparing AIPM Development Environment..."
echo "=============================================="

cd "$(dirname "$0")"

# 1. Install dependencies
echo "📦 Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "   Dependencies already installed"
fi

# 2. Check AWS credentials
echo "🔑 Step 2: Checking AWS credentials..."
if aws sts get-caller-identity &>/dev/null; then
  echo "   ✅ AWS credentials configured"
  aws sts get-caller-identity --query 'Account' --output text | xargs echo "   Account:"
else
  echo "   ❌ AWS credentials not configured"
  echo "   Run: aws configure"
  exit 1
fi

# 3. Check required environment variables
echo "🔐 Step 3: Checking environment variables..."
MISSING_VARS=()

if [ -z "$GITHUB_TOKEN" ]; then
  MISSING_VARS+=("GITHUB_TOKEN")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "   ⚠️  Missing environment variables: ${MISSING_VARS[*]}"
  echo "   Set them in your shell profile or .env file"
else
  echo "   ✅ All required environment variables set"
fi

# 4. Verify AWS resources exist
echo "🏗️  Step 4: Checking AWS resources..."

# Check DynamoDB tables
TABLES=("aipm-backend-dev-stories" "aipm-backend-dev-acceptance-tests")
for TABLE in "${TABLES[@]}"; do
  if aws dynamodb describe-table --table-name "$TABLE" --region us-east-1 &>/dev/null; then
    echo "   ✅ DynamoDB table: $TABLE"
  else
    echo "   ⚠️  DynamoDB table missing: $TABLE (will be created on first deploy)"
  fi
done

# Check S3 buckets
BUCKETS=("aipm-dev-frontend-hosting" "aipm-static-hosting-demo")
for BUCKET in "${BUCKETS[@]}"; do
  if aws s3 ls "s3://$BUCKET" --region us-east-1 &>/dev/null; then
    echo "   ✅ S3 bucket: $BUCKET"
  else
    echo "   ⚠️  S3 bucket missing: $BUCKET (create manually if needed)"
  fi
done

# 5. Check GitHub repository access
echo "🐙 Step 5: Checking GitHub repository..."
if [ -n "$GITHUB_TOKEN" ]; then
  REPO_CHECK=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/demian7575/aipm | jq -r '.name' 2>/dev/null || echo "error")
  
  if [ "$REPO_CHECK" = "aipm" ]; then
    echo "   ✅ GitHub repository access confirmed"
  else
    echo "   ❌ Cannot access GitHub repository (check GITHUB_TOKEN)"
  fi
else
  echo "   ⚠️  GITHUB_TOKEN not set, skipping GitHub check"
fi

# 6. Verify deployment scripts
echo "📝 Step 6: Checking deployment scripts..."
SCRIPTS=("deploy-dev-full.sh" "deploy-prod-complete.sh")
for SCRIPT in "${SCRIPTS[@]}"; do
  if [ -f "$SCRIPT" ]; then
    chmod +x "$SCRIPT"
    echo "   ✅ $SCRIPT (executable)"
  else
    echo "   ❌ Missing: $SCRIPT"
  fi
done

# 7. Summary
echo ""
echo "✅ Development Environment Ready!"
echo "=============================================="
echo ""
echo "📚 Quick Start Commands:"
echo "   Deploy to development:  ./deploy-dev-full.sh"
echo "   Deploy to production:   ./deploy-prod-complete.sh"
echo "   Run gating tests:       npm test (if configured)"
echo ""
echo "🔗 Useful Links:"
echo "   Dev Frontend:  http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
echo "   Prod Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "   GitHub:        https://github.com/demian7575/aipm"
echo ""
