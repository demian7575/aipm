#!/bin/bash
# Real Behavior Gating Tests - No Mocks, Test Actual Workflows

set -e

echo "🧪 AIPM Real Behavior Gating Tests"
echo "Testing actual workflows, not mocks or simulations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run each phase and count real results
echo ""
echo "🔴 PHASE 1: Real Security & Data Safety Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE1_OUTPUT=$(./scripts/testing/real-phase1-tests.sh 2>&1)
echo "$PHASE1_OUTPUT"
PHASE1_PASS=$(echo "$PHASE1_OUTPUT" | grep "✅" | wc -l)
PHASE1_FAIL=$(echo "$PHASE1_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 1: ✅ $PHASE1_PASS passed, ❌ $PHASE1_FAIL failed"

if [[ $PHASE1_FAIL -gt 0 ]]; then
    echo "🚫 BLOCKING - Critical security/data issues detected"
    exit 1
fi

echo ""
echo "🟡 PHASE 2: Real Performance & API Workflow Tests"  
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE2_OUTPUT=$(./scripts/testing/real-phase2-tests.sh 2>&1)
echo "$PHASE2_OUTPUT"
PHASE2_PASS=$(echo "$PHASE2_OUTPUT" | grep "✅" | wc -l)
PHASE2_FAIL=$(echo "$PHASE2_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 2: ✅ $PHASE2_PASS passed, ❌ $PHASE2_FAIL failed"

echo ""
echo "🟢 PHASE 3: Real Infrastructure & Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE3_OUTPUT=$(./scripts/testing/real-phase3-tests.sh 2>&1)
echo "$PHASE3_OUTPUT"
PHASE3_PASS=$(echo "$PHASE3_OUTPUT" | grep "✅" | wc -l)
PHASE3_FAIL=$(echo "$PHASE3_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 3: ✅ $PHASE3_PASS passed, ❌ $PHASE3_FAIL failed"

echo ""
echo "🔄 PHASE 4: Real End-to-End Workflow Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE4_OUTPUT=$(./scripts/testing/real-phase4-tests.sh 2>&1)
echo "$PHASE4_OUTPUT"
PHASE4_PASS=$(echo "$PHASE4_OUTPUT" | grep "✅" | wc -l)
PHASE4_FAIL=$(echo "$PHASE4_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 4: ✅ $PHASE4_PASS passed, ❌ $PHASE4_FAIL failed"

echo ""
echo "🔧 PHASE 5: Code Generation & Acceptance Tests Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE5_OUTPUT=$(./scripts/testing/real-phase5-tests.sh 2>&1)
echo "$PHASE5_OUTPUT"
PHASE5_PASS=$(echo "$PHASE5_OUTPUT" | grep "✅" | wc -l)
PHASE5_FAIL=$(echo "$PHASE5_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 5: ✅ $PHASE5_PASS passed, ❌ $PHASE5_FAIL failed"

# Calculate totals
TOTAL_PASS=$((PHASE1_PASS + PHASE2_PASS + PHASE3_PASS + PHASE4_PASS + PHASE5_PASS))
TOTAL_FAIL=$((PHASE1_FAIL + PHASE2_FAIL + PHASE3_FAIL + PHASE4_FAIL + PHASE5_FAIL))
TOTAL_TESTS=$((TOTAL_PASS + TOTAL_FAIL))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 REAL BEHAVIOR TEST RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Total Tests Passed: $TOTAL_PASS"
echo "❌ Total Tests Failed: $TOTAL_FAIL"
echo "📈 Total Tests Run: $TOTAL_TESTS"
echo ""
echo "🎯 Tests performed:"
echo "   • Real story CRUD operations"
echo "   • Actual draft generation with content validation"
echo "   • Real database persistence and consistency"
echo "   • Actual API performance under load"
echo "   • Real frontend-backend integration"
echo "   • Complete end-to-end workflows"
echo "   • Code generation and acceptance test creation"

if [ $TOTAL_FAIL -eq 0 ]; then
    echo ""
    echo "🎉 ALL $TOTAL_TESTS REAL BEHAVIOR TESTS PASSED!"
    echo "✅ System approved for deployment"
    exit 0
else
    echo ""
    echo "⚠️  $TOTAL_FAIL out of $TOTAL_TESTS real behavior tests failed"
    echo "❌ Fix failures before deployment"
    exit 1
fi
