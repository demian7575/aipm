#!/bin/bash
set -e

echo "🌅 Starting AIPM Development Session..."
echo "========================================"

cd "$(dirname "$0")"

# 1. Pull latest changes
echo "📥 Step 1: Pulling latest changes from GitHub..."
git checkout main
git pull origin main

# 2. Install/update dependencies if needed
echo "📦 Step 2: Checking dependencies..."
if [ package.json -nt node_modules/.package-lock.json ] 2>/dev/null || [ ! -d node_modules ]; then
  echo "   Installing/updating dependencies..."
  npm install
else
  echo "   ✅ Dependencies up to date"
fi

# 3. Check AWS connection
echo "🔑 Step 3: Verifying AWS connection..."
if aws sts get-caller-identity &>/dev/null; then
  echo "   ✅ AWS connected"
else
  echo "   ❌ AWS not configured - run: aws configure"
  exit 1
fi

# 4. Check environment variables
echo "🔐 Step 4: Checking environment..."
if [ -z "$GITHUB_TOKEN" ]; then
  echo "   ⚠️  GITHUB_TOKEN not set"
  echo "   Export it: export GITHUB_TOKEN=your_token"
else
  echo "   ✅ GITHUB_TOKEN configured"
fi

echo ""
echo "✅ Ready to develop!"
echo "========================================"
echo ""
echo "📝 Common Commands:"
echo "   Edit code:              code . (or your editor)"
echo "   Deploy to dev:          ./deploy-dev-full.sh"
echo "   Deploy to prod:         ./deploy-prod-complete.sh"
echo "   Run gating tests:       Open browser → production-gating-tests.html"
echo ""
echo "🌐 Environments:"
echo "   Dev:  http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
echo "   Prod: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo ""
echo "💡 Workflow:"
echo "   1. Make changes in apps/frontend/public/"
echo "   2. Test locally (optional)"
echo "   3. Deploy: ./deploy-dev-full.sh (test) or ./deploy-prod-complete.sh (production)"
echo "   4. Commit: git add . && git commit -m 'message' && git push"
echo ""
