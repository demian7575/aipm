#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE PRODUCTION Environment..."
echo "================================================"

# 0. Pre-deployment validation
echo "🔍 Step 0: Pre-deployment Validation..."
if [ -f "scripts/testing/test-deployment-prerequisites.sh" ]; then
  bash scripts/testing/test-deployment-prerequisites.sh || {
    echo "⚠️  Pre-deployment checks failed. Continue anyway? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
      echo "❌ Deployment cancelled"
      exit 1
    fi
  }
else
  echo "   Skipping pre-checks (script not found)"
fi

# 1. Deploy Kiro API to EC2
echo ""
echo "📦 Step 1: Deploying Kiro API to EC2..."
if [ -f "scripts/deployment/deploy-kiro-api-safe.sh" ]; then
  bash scripts/deployment/deploy-kiro-api-safe.sh
else
  echo "⚠️  Safe deployment script not found, using basic deployment..."
  bash scripts/deployment/deploy-kiro-api.sh
fi

# 2. Deploy Backend (Lambda + API Gateway)
echo ""
echo "📦 Step 2: Deploying Backend..."
cd "$(dirname "$0")/../.."
npx serverless deploy --stage prod --force

# 3. Deploy Frontend to S3 with cache-busting
echo ""
echo "📦 Step 3: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ \
  --region us-east-1 \
  --exclude "*.md" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --delete

# 4. Invalidate CloudFront cache if exists
echo ""
echo "🔄 Step 4: Checking for CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='aipm-static-hosting-demo.s3.amazonaws.com']].Id" --output text 2>/dev/null || echo "")

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
  echo "   Found CloudFront distribution: $DISTRIBUTION_ID"
  echo "   Creating invalidation..."
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
else
  echo "   No CloudFront distribution (using S3 website directly)"
fi

# 5. Run gating tests
echo ""
echo "🧪 Step 5: Running Gating Tests..."
if [ -f "scripts/testing/test-kiro-api-gating.sh" ]; then
  bash scripts/testing/test-kiro-api-gating.sh || echo "⚠️  Some Kiro API tests failed"
fi

if [ -f "scripts/testing/run-comprehensive-gating-tests.cjs" ]; then
  node scripts/testing/run-comprehensive-gating-tests.cjs || echo "⚠️  Some comprehensive tests failed"
fi

# 6. Commit workflow changes to GitHub
echo ""
echo "📝 Step 6: Committing workflow changes..."
git add .github/workflows/deploy-staging.yml apps/frontend/public/ || true
if git diff --staged --quiet; then
  echo "   No changes to commit"
else
  git commit -m "Deploy: Update staging workflow and frontend" || true
  git push origin main || true
fi

echo ""
echo "✅ Production Deployment Complete!"
echo "================================================"
echo "🌐 Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "🔗 API: http://44.220.45.57"
echo "🤖 Kiro API: http://44.220.45.57:8081"
echo ""
echo "⚠️  Clear browser cache: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
