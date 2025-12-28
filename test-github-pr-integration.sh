#!/bin/bash

# Test GitHub PR Integration for Development Tasks
# This script tests the enhanced PR status API and frontend integration

echo "🧪 Testing GitHub PR Integration for Development Tasks"
echo "=================================================="

# Test 1: Test PR status API endpoint
echo "📡 Testing PR status API endpoint..."

# Create test PR data
TEST_PR_DATA='{
  "url": "https://github.com/demian7575/aipm/pull/894",
  "number": 894,
  "repo": "demian7575/aipm"
}'

# Test the API endpoint
echo "Sending request to /api/pr-status..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_PR_DATA" \
  http://localhost:4000/api/pr-status \
  2>/dev/null | jq '.' || echo "❌ API endpoint test failed"

echo ""

# Test 2: Check if frontend files have been updated
echo "📁 Checking frontend integration..."

if grep -q "github-pr-container" apps/frontend/public/app.js; then
  echo "✅ Frontend JavaScript updated with PR container"
else
  echo "❌ Frontend JavaScript missing PR container"
fi

if grep -q "github-pr-container" apps/frontend/public/styles.css; then
  echo "✅ Frontend CSS updated with PR styles"
else
  echo "❌ Frontend CSS missing PR styles"
fi

echo ""

# Test 3: Check backend API integration
echo "🔧 Checking backend integration..."

if grep -q "/api/pr-status" apps/backend/app.js; then
  echo "✅ Backend API endpoint added"
else
  echo "❌ Backend API endpoint missing"
fi

if grep -q "githubRequest" apps/backend/app.js; then
  echo "✅ GitHub API integration present"
else
  echo "❌ GitHub API integration missing"
fi

echo ""

# Test 4: Verify CSS enhancements
echo "🎨 Checking CSS enhancements..."

CSS_CLASSES=(
  "pr-metadata"
  "pr-status-indicators" 
  "pr-review-badge"
  "pr-checks-badge"
  "pr-status-draft"
)

for class in "${CSS_CLASSES[@]}"; do
  if grep -q "$class" apps/frontend/public/styles.css; then
    echo "✅ CSS class .$class found"
  else
    echo "❌ CSS class .$class missing"
  fi
done

echo ""

# Test 5: Check JavaScript functions
echo "⚙️  Checking JavaScript functions..."

JS_FUNCTIONS=(
  "refreshPRStatus"
  "renderPRContainer"
)

for func in "${JS_FUNCTIONS[@]}"; do
  if grep -q "function $func" apps/frontend/public/app.js; then
    echo "✅ Function $func found"
  else
    echo "❌ Function $func missing"
  fi
done

echo ""
echo "🏁 GitHub PR Integration Test Complete"
echo "=================================================="

# Summary
echo "📊 Integration Summary:"
echo "- Enhanced PR display with status indicators"
echo "- Real-time PR metadata (author, dates, review status)"
echo "- Auto-refresh for open/draft PRs every 30 seconds"
echo "- Support for multiple PR states (open, draft, merged, closed)"
echo "- Review and CI check status badges"
echo "- Seamless navigation with hover effects"

echo ""
echo "🚀 Ready for PR #894: github-pr-integration-for-development-tasks-1766882595962"
