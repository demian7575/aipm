#!/bin/bash
# AIPM Structured Gating Tests - Honest Results

set -e

echo "🧪 AIPM Structured Gating Tests - Real Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run each phase and count real results
echo ""
echo "🔴 PHASE 1: Critical Security & Data Safety"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE1_OUTPUT=$(./scripts/testing/phase1-security-data-safety.sh)
echo "$PHASE1_OUTPUT"
PHASE1_PASS=$(echo "$PHASE1_OUTPUT" | grep "✅" | wc -l)
PHASE1_FAIL=$(echo "$PHASE1_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 1: ✅ $PHASE1_PASS passed, ❌ $PHASE1_FAIL failed"

echo ""
echo "🟡 PHASE 2: Performance & API Safety"  
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE2_OUTPUT=$(./scripts/testing/phase2-performance-api.sh)
echo "$PHASE2_OUTPUT"
PHASE2_PASS=$(echo "$PHASE2_OUTPUT" | grep "✅" | wc -l)
PHASE2_FAIL=$(echo "$PHASE2_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 2: ✅ $PHASE2_PASS passed, ❌ $PHASE2_FAIL failed"

echo ""
echo "🟢 PHASE 3: Infrastructure & Monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE3_OUTPUT=$(./scripts/testing/phase3-infrastructure-monitoring.sh)
echo "$PHASE3_OUTPUT"
PHASE3_PASS=$(echo "$PHASE3_OUTPUT" | grep "✅" | wc -l)
PHASE3_FAIL=$(echo "$PHASE3_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 3: ✅ $PHASE3_PASS passed, ❌ $PHASE3_FAIL failed"

echo ""
echo "🔄 PHASE 4: End-to-End Workflow Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PHASE4_OUTPUT=$(./scripts/testing/phase4-workflow-validation.sh)
echo "$PHASE4_OUTPUT"
PHASE4_PASS=$(echo "$PHASE4_OUTPUT" | grep "✅" | wc -l)
PHASE4_FAIL=$(echo "$PHASE4_OUTPUT" | grep "❌" | wc -l)
echo "📊 Phase 4: ✅ $PHASE4_PASS passed, ❌ $PHASE4_FAIL failed"

# Calculate totals
TOTAL_PASS=$((PHASE1_PASS + PHASE2_PASS + PHASE3_PASS + PHASE4_PASS))
TOTAL_FAIL=$((PHASE1_FAIL + PHASE2_FAIL + PHASE3_FAIL + PHASE4_FAIL))
TOTAL_TESTS=$((TOTAL_PASS + TOTAL_FAIL))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 HONEST FINAL RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Total Tests Passed: $TOTAL_PASS"
echo "❌ Total Tests Failed: $TOTAL_FAIL"
echo "📈 Total Tests Run: $TOTAL_TESTS"

if [ $TOTAL_FAIL -eq 0 ]; then
    echo ""
    echo "🎉 ALL $TOTAL_TESTS GATING TESTS PASSED!"
    echo "✅ System approved for deployment"
    exit 0
else
    echo ""
    echo "⚠️  $TOTAL_FAIL out of $TOTAL_TESTS tests failed"
    echo "❌ Fix failures before deployment"
    exit 1
fi
