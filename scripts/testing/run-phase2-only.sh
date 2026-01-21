#!/bin/bash
# Run Phase 2 only (skip Phase 2-1 Mock)

set +e

SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/test-functions.sh"

# Configuration
API_BASE="${API_BASE:-http://3.92.96.67:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://3.92.96.67:8083}"
TARGET_ENV="${TARGET_ENV:-prod}"

if [[ "$TARGET_ENV" == "dev" ]]; then
    SSH_HOST="44.222.168.46"
    API_BASE="http://localhost:4000"
    SEMANTIC_API_BASE="http://localhost:8083"
else
    SSH_HOST="3.92.96.67"
    API_BASE="http://localhost:4000"
    SEMANTIC_API_BASE="http://localhost:8083"
fi

export API_BASE SEMANTIC_API_BASE SSH_HOST

# Initialize test counter
export TEST_COUNTER_DIR="/tmp/aipm-test-$$"
mkdir -p "$TEST_COUNTER_DIR"
reset_test_counters

echo "🎯 Running Phase 2 only (Real Kiro CLI)"
echo "Environment: $TARGET_ENV"
echo ""

phase2_start=$(date +%s)

# Run Phase 2
source "$SCRIPT_DIR/phase2-performance-api.sh"

phase2_end=$(date +%s)
phase2_duration=$((phase2_end - phase2_start))

# Get results
total_passed=$(get_passed_count)
total_failed=$(get_failed_count)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PHASE 2 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tests Passed: $total_passed"
echo "❌ Tests Failed: $total_failed"
echo "📈 Total Tests: $((total_passed + total_failed))"
echo "⏱️  Duration: ${phase2_duration}s ($(printf '%dm %ds' $((phase2_duration/60)) $((phase2_duration%60))))"
echo ""

# Cleanup
rm -rf "$TEST_COUNTER_DIR"

if [[ $total_failed -eq 0 ]]; then
    echo "🎉 ALL TESTS PASSED!"
    exit 0
else
    echo "⚠️  Some tests failed"
    exit 1
fi
