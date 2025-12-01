#!/bin/bash
# AIPM Daily Startup Script
# Run this every morning to set up your development environment

set -e

echo "🚀 AIPM Development Environment Startup"
echo "========================================"
echo ""

# 1. Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# 2. Update from remote
echo "📥 Fetching latest changes..."
git fetch origin
git pull origin $CURRENT_BRANCH

# 3. Check if main is ahead
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
if [ "$BEHIND" -gt 0 ]; then
    echo "⚠️  Your branch is $BEHIND commits behind main"
    echo "   Consider: git merge origin/main"
fi

# 4. Show recent commits
echo ""
echo "📝 Recent commits (last 5):"
git log --oneline -5

# 5. Check for uncommitted changes
echo ""
if git diff-index --quiet HEAD --; then
    echo "✅ Working tree clean"
else
    echo "⚠️  You have uncommitted changes:"
    git status --short
fi

# 6. Environment status
echo ""
echo "🌍 Environment Status:"
echo "  Production:  http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
echo "  Development: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/"
echo ""
echo "  Prod API: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"
echo "  Dev API:  https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"

# 7. Check AWS credentials
echo ""
if aws sts get-caller-identity &>/dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)
    echo "✅ AWS credentials valid"
    echo "   Account: $AWS_ACCOUNT"
    echo "   User: $AWS_USER"
else
    echo "❌ AWS credentials not configured"
    echo "   Run: aws configure"
fi

# 8. Check GitHub token
echo ""
if [ -n "$GITHUB_TOKEN" ]; then
    echo "✅ GITHUB_TOKEN is set"
else
    echo "⚠️  GITHUB_TOKEN not set"
    echo "   Export it: export GITHUB_TOKEN=your_token"
fi

# 9. Quick health check
echo ""
echo "🏥 Quick Health Check:"
PROD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/health || echo "000")
if [ "$PROD_STATUS" = "200" ]; then
    echo "  ✅ Production API: Healthy"
else
    echo "  ❌ Production API: Down (HTTP $PROD_STATUS)"
fi

DEV_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev/api/health || echo "000")
if [ "$DEV_STATUS" = "200" ]; then
    echo "  ✅ Development API: Healthy"
else
    echo "  ❌ Development API: Down (HTTP $DEV_STATUS)"
fi

# 10. Context for AI
echo ""
echo "🤖 AI Context Ready:"
echo "   Project: AIPM (AI Project Manager)"
echo "   Location: /repo/ebaejun/tools/aws/aipm"
echo "   Branch: $CURRENT_BRANCH"
echo "   Docs: docs/INDEX.md"
echo ""
echo "📚 Key Documentation:"
echo "   - README.md                  (Project overview)"
echo "   - DEVELOPMENT_WORKFLOW.md    (Development process)"
echo "   - DevelopmentBackground.md   (Technical details)"
echo ""
echo "✅ Startup complete! Ready to develop."
echo ""
echo "💡 Quick Commands:"
echo "   ./deploy-dev-full.sh   - Deploy to development"
echo "   ./deploy-prod-full.sh  - Deploy to production"
echo "   git checkout -b feature/name  - Create feature branch"
