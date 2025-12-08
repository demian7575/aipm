#!/bin/bash
# Merge PR Workflow Gating Tests
# Validates Merge PR button functionality and prevents common issues

PASSED=0
FAILED=0

echo "🔍 Merge PR Workflow Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_pass() {
    echo "   ✅ $1"
    ((PASSED++))
}

test_fail() {
    echo "   ❌ $1"
    ((FAILED++))
}

# Test 1: Check checkPRUpToDate function exists
echo "📋 Test 1: checkPRUpToDate function exists"
if grep -q "async function checkPRUpToDate" apps/frontend/public/app.js; then
    test_pass "checkPRUpToDate function found"
else
    test_fail "checkPRUpToDate function missing"
fi
echo ""

# Test 2: Verify repo parsing splits owner/repo correctly
echo "📋 Test 2: Repo parsing splits owner/repo"
if grep -q "const \[owner, repo\] = repoPath.split('/');" apps/frontend/public/app.js; then
    test_pass "Repo parsing uses split() correctly"
else
    test_fail "Repo parsing may be incorrect"
fi
echo ""

# Test 3: Check for unknown mergeable_state handling
echo "📋 Test 3: Handles unknown mergeable_state"
if grep -q "mergeableState === 'unknown'" apps/frontend/public/app.js; then
    test_pass "Unknown mergeable_state is handled"
else
    test_fail "Unknown mergeable_state not handled - will block fresh PRs"
fi
echo ""

# Test 4: Check for already-merged PR detection
echo "📋 Test 4: Detects already-merged PRs"
if grep -q "merged_at" apps/frontend/public/app.js; then
    test_pass "Already-merged PR detection exists"
else
    test_fail "No check for already-merged PRs"
fi
echo ""

# Test 5: Verify state.stories uses array methods not Map methods
echo "📋 Test 5: state.stories uses array methods"
if grep -q "state.stories.get" apps/frontend/public/app.js; then
    test_fail "state.stories.get() found - should use .find() for arrays"
else
    test_pass "No Map methods used on state.stories array"
fi
echo ""

# Test 6: Check mergePR function exists
echo "📋 Test 6: mergePR function exists"
if grep -q "async function mergePR" apps/frontend/public/app.js; then
    test_pass "mergePR function found"
else
    test_fail "mergePR function missing"
fi
echo ""

# Test 7: Verify backend merge endpoint exists
echo "📋 Test 7: Backend merge endpoint"
if grep -q "/api/merge-pr" apps/backend/app.js; then
    test_pass "Backend /api/merge-pr endpoint exists"
else
    test_fail "Backend merge endpoint missing"
fi
echo ""

# Test 8: Check DynamoDB adapter handles UPDATE
echo "📋 Test 8: DynamoDB UPDATE support"
if grep -q "UPDATE user_stories" apps/backend/dynamodb.js 2>/dev/null; then
    test_pass "DynamoDB adapter handles UPDATE statements"
else
    test_fail "DynamoDB adapter may not handle UPDATE - Done button won't work"
fi
echo ""

# Test 9: Verify Done button includes title in PATCH
echo "📋 Test 9: Done button sends title"
if grep -q "title: story.title" apps/frontend/public/app.js; then
    test_pass "Done button includes story title in PATCH"
else
    test_fail "Done button missing title - will get 400 error"
fi
echo ""

# Test 10: Check acceptance test requirement removed
echo "📋 Test 10: Acceptance test not required for Done status"
if grep -q "details.missingTests" apps/backend/app.js; then
    test_fail "missingTests check still exists - blocks Done without tests"
else
    test_pass "Acceptance test requirement removed for Done status"
fi
echo ""

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASSED passed, $FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -gt 0 ]; then
    echo "❌ Merge PR workflow has issues"
    exit 1
else
    echo "✅ All Merge PR workflow checks passed"
    exit 0
fi
