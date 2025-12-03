#!/bin/bash

# Test script for Merge button functionality

echo "Testing Merge Button Implementation"
echo "===================================="
echo ""

# Check if backend has mergePRToMain function
echo "1. Checking backend implementation..."
if grep -q "async function mergePRToMain" apps/backend/app.js; then
    echo "   ✅ mergePRToMain function found"
else
    echo "   ❌ mergePRToMain function NOT found"
    exit 1
fi

# Check if merge endpoint exists
if grep -q "mergePRMatch" apps/backend/app.js; then
    echo "   ✅ Merge API endpoint found"
else
    echo "   ❌ Merge API endpoint NOT found"
    exit 1
fi

# Check if frontend has merge button
echo ""
echo "2. Checking frontend implementation..."
if grep -q "merge-pr-btn" apps/frontend/public/app.js; then
    echo "   ✅ Merge button found in frontend"
else
    echo "   ❌ Merge button NOT found in frontend"
    exit 1
fi

# Check if confirmation dialog exists
if grep -q "Run gating tests and merge this PR to main" apps/frontend/public/app.js; then
    echo "   ✅ Confirmation dialog found"
else
    echo "   ❌ Confirmation dialog NOT found"
    exit 1
fi

# Check if styling exists
echo ""
echo "3. Checking styling..."
if grep -q "merge-pr-btn" apps/frontend/public/styles.css; then
    echo "   ✅ Merge button styling found"
else
    echo "   ❌ Merge button styling NOT found"
    exit 1
fi

# Check if gating tests script exists
echo ""
echo "4. Checking gating tests..."
if [ -f "scripts/testing/run-comprehensive-gating-tests.cjs" ]; then
    echo "   ✅ Gating tests script exists"
else
    echo "   ❌ Gating tests script NOT found"
    exit 1
fi

echo ""
echo "===================================="
echo "✅ All checks passed!"
echo ""
echo "Implementation includes:"
echo "  - Backend mergePRToMain function"
echo "  - POST /api/stories/:storyId/prs/:prNumber/merge endpoint"
echo "  - Frontend Merge button with confirmation"
echo "  - Green button styling"
echo "  - Integration with gating tests"
echo ""
echo "To test manually:"
echo "  1. Start the dev server: npm run dev"
echo "  2. Create a user story with a PR"
echo "  3. Click the green 'Merge' button"
echo "  4. Confirm the merge dialog"
echo "  5. Verify gating tests run and PR merges"
