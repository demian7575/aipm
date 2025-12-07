#!/bin/bash
# Unified Gating Test Runner - All Environments + Kiro API

set -e

echo "🚀 AIPM Complete Gating Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_PASSED=0
TOTAL_FAILED=0

# 1. Run comprehensive environment tests
echo "📦 Running Environment Tests (Production + Development)..."
if node scripts/testing/run-comprehensive-gating-tests.cjs; then
    echo "✅ Environment tests passed"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo "❌ Environment tests failed"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 2. Run browser-based tests (90 tests: 45 prod + 45 dev)
echo "🌐 Running Browser-Based Tests (90 tests)..."
if node scripts/testing/run-browser-tests-automated.cjs; then
    echo "✅ Browser tests validated"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo "❌ Browser tests failed"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 3. Run Deployment Configuration Tests
echo "⚙️  Running Deployment Configuration Tests..."
if bash scripts/testing/test-deployment-config-gating.sh; then
    echo "✅ Deployment configuration tests passed"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo "❌ Deployment configuration tests failed"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 4. Run Kiro API tests (if available)
if [ -n "$KIRO_API_URL" ] || curl -s -m 2 http://44.220.45.57:8081/health > /dev/null 2>&1; then
    echo "🤖 Running Kiro API Tests..."
    if bash scripts/testing/test-kiro-api-gating.sh; then
        echo "✅ Kiro API tests passed"
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        echo "❌ Kiro API tests failed"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
else
    echo "⏭️  Skipping Kiro API tests (service not available)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 COMPLETE GATING TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Suites Passed: $TOTAL_PASSED"
echo "❌ Test Suites Failed: $TOTAL_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TOTAL_FAILED -eq 0 ]; then
    echo "🎉 ALL GATING TESTS PASSED"
    echo "✅ Ready for deployment"
    exit 0
else
    echo "⚠️  SOME GATING TESTS FAILED"
    echo "❌ Fix issues before deployment"
    exit 1
fi
