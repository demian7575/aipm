#!/bin/bash
# Test script for Run in Staging feature

echo "🧪 Testing Run in Staging Feature"
echo "=================================="
echo ""

# Check if workflow file exists
echo "1. Checking GitHub workflow file..."
if [ -f ".github/workflows/run-in-staging.yml" ]; then
    echo "   ✅ Workflow file exists"
else
    echo "   ❌ Workflow file missing"
    exit 1
fi

# Check frontend implementation
echo ""
echo "2. Checking frontend implementation..."
if grep -q "buildRunInStagingModalContent" apps/frontend/public/app.js; then
    echo "   ✅ Modal function exists"
else
    echo "   ❌ Modal function missing"
    exit 1
fi

if grep -q "Run in Staging" apps/frontend/public/app.js; then
    echo "   ✅ Button text found"
else
    echo "   ❌ Button text missing"
    exit 1
fi

# Check backend implementation
echo ""
echo "3. Checking backend implementation..."
if grep -q "/api/run-staging" apps/backend/app.js; then
    echo "   ✅ API endpoint exists"
else
    echo "   ❌ API endpoint missing"
    exit 1
fi

if grep -q "clearAndCopyData" apps/backend/app.js; then
    echo "   ✅ Data sync function exists"
else
    echo "   ❌ Data sync function missing"
    exit 1
fi

# Check CSS styles
echo ""
echo "4. Checking CSS styles..."
if grep -q "staging-output" apps/frontend/public/styles.css; then
    echo "   ✅ Staging styles exist"
else
    echo "   ❌ Staging styles missing"
    exit 1
fi

# Summary
echo ""
echo "=================================="
echo "✅ All Run in Staging components verified!"
echo ""
echo "📋 Feature Summary:"
echo "   - GitHub Workflow: .github/workflows/run-in-staging.yml"
echo "   - Frontend Modal: buildRunInStagingModalContent()"
echo "   - Backend API: POST /api/run-staging"
echo "   - Styles: .staging-output, .workflow-steps"
echo ""
echo "🚀 To use the feature:"
echo "   1. Start the server: npm run dev"
echo "   2. Navigate to a user story"
echo "   3. Create a PR in Development Tasks"
echo "   4. Click 'Run in Staging' button"
echo ""
echo "📖 See RUN_IN_STAGING_IMPLEMENTATION.md for details"
