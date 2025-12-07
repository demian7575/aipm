#!/bin/bash
# End-to-End Code Generation Gating Test
# Tests: Create PR -> Generate Code -> Verify Commit -> Cleanup

PASSED=0
FAILED=0
PR_NUMBER=""
BRANCH_NAME=""

echo "🧪 End-to-End Code Generation Test"
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

cleanup() {
    if [ -n "$PR_NUMBER" ]; then
        echo ""
        echo "🧹 Cleaning up PR #$PR_NUMBER..."
        gh pr close "$PR_NUMBER" --delete-branch --repo demian7575/aipm 2>/dev/null || true
        echo "   ✅ PR #$PR_NUMBER closed and branch deleted"
    fi
}

trap cleanup EXIT

# Test 1: Create PR via API
echo "📋 Test 1: Create PR via API"
TIMESTAMP=$(date +%s)
RESPONSE=$(curl -s -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d "{
    \"owner\": \"demian7575\",
    \"repo\": \"aipm\",
    \"taskTitle\": \"E2E Test $TIMESTAMP\",
    \"objective\": \"Add console.log('e2e-test-$TIMESTAMP') to app.js\",
    \"constraints\": \"None\",
    \"acceptanceCriteria\": [\"Console log added\"],
    \"target\": \"pr\"
  }")

PR_NUMBER=$(echo "$RESPONSE" | jq -r '.number // empty')
BRANCH_NAME=$(echo "$RESPONSE" | jq -r '.branchName // empty')

if [ -n "$PR_NUMBER" ] && [ "$PR_NUMBER" != "null" ]; then
    test_pass "PR #$PR_NUMBER created on branch $BRANCH_NAME"
else
    test_fail "Failed to create PR"
    echo "      Response: $RESPONSE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Results: $PASSED passed, $FAILED failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ End-to-end code generation test failed"
    exit 1
fi

# Test 2: Wait for initial commit (TASK.md)
echo ""
echo "📋 Test 2: Verify Initial Commit"
sleep 3
INITIAL_COMMITS=$(curl -s "https://api.github.com/repos/demian7575/aipm/pulls/$PR_NUMBER/commits" | jq -r 'length')
if [ "$INITIAL_COMMITS" -ge 1 ]; then
    test_pass "Initial commit exists ($INITIAL_COMMITS commits)"
else
    test_fail "No initial commit found"
fi

# Test 3: Wait for code generation (max 2 minutes)
echo ""
echo "📋 Test 3: Wait for Code Generation (max 120s)"
MAX_WAIT=120
ELAPSED=0
CODE_GENERATED=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep 10
    ELAPSED=$((ELAPSED + 10))
    
    COMMITS=$(curl -s "https://api.github.com/repos/demian7575/aipm/pulls/$PR_NUMBER/commits" | jq -r 'length')
    
    if [ "$COMMITS" -gt "$INITIAL_COMMITS" ]; then
        CODE_GENERATED=true
        test_pass "Code generated after ${ELAPSED}s ($COMMITS commits total)"
        break
    fi
    
    echo "   ⏳ Waiting... ${ELAPSED}s elapsed ($COMMITS commits)"
done

if [ "$CODE_GENERATED" = false ]; then
    test_fail "Code not generated after ${MAX_WAIT}s"
    
    # Debug: Check Kiro API status
    echo ""
    echo "   🔍 Debug: Kiro API Status"
    KIRO_STATUS=$(curl -s http://44.220.45.57:8081/health | jq -r '.workers[] | select(.busy == true) | .currentTask' 2>/dev/null)
    if [ -n "$KIRO_STATUS" ]; then
        echo "      Worker busy with: $KIRO_STATUS"
    else
        echo "      No busy workers"
    fi
fi

# Test 4: Verify commit message
echo ""
echo "📋 Test 4: Verify Commit Message"
LAST_COMMIT=$(curl -s "https://api.github.com/repos/demian7575/aipm/pulls/$PR_NUMBER/commits" | jq -r '.[-1].commit.message')
if echo "$LAST_COMMIT" | grep -q "feat: implement feature via Kiro CLI"; then
    test_pass "Correct commit message found"
else
    test_fail "Unexpected commit message: $LAST_COMMIT"
fi

# Test 5: Verify files were changed
echo ""
echo "📋 Test 5: Verify Files Changed"
FILES_CHANGED=$(curl -s "https://api.github.com/repos/demian7575/aipm/pulls/$PR_NUMBER/files" | jq -r 'length')
if [ "$FILES_CHANGED" -gt 1 ]; then
    test_pass "$FILES_CHANGED files changed (including TASK.md)"
else
    test_fail "Only $FILES_CHANGED file(s) changed (expected > 1)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASSED passed, $FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -gt 0 ]; then
    echo "❌ End-to-end code generation test failed"
    exit 1
else
    echo "✅ End-to-end code generation test passed"
    exit 0
fi
