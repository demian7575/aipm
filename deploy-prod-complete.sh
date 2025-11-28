#!/bin/bash
set -e

echo "🚀 Deploying COMPLETE PRODUCTION Environment..."
echo "================================================"

# 1. Deploy Backend (Lambda + API Gateway)
echo "📦 Step 1: Deploying Backend..."
cd "$(dirname "$0")"
npx serverless deploy --stage prod --force

# 2. Deploy Frontend to S3 with cache-busting
echo "📦 Step 2: Deploying Frontend to S3..."
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ \
  --region us-east-1 \
  --exclude "*.md" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --delete

# 3. Invalidate CloudFront cache if exists
echo "🔄 Step 3: Checking for CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='aipm-static-hosting-demo.s3.amazonaws.com']].Id" --output text 2>/dev/null || echo "")

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
  echo "   Found CloudFront distribution: $DISTRIBUTION_ID"
  echo "   Creating invalidation..."
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
else
  echo "   No CloudFront distribution (using S3 website directly)"
fi

# 4. Commit workflow changes to GitHub
echo "📝 Step 4: Committing workflow changes..."
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
echo "🔗 API: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"
echo ""
echo "⚠️  Clear browser cache: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
