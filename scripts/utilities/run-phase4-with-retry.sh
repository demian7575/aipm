#!/bin/bash
# Phase 4 Test Runner with Retry Logic
# Runs Phase 4 tests up to 10 times, allowing manual fixes between runs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PHASE4_SCRIPT="$PROJECT_ROOT/scripts/testing/phase4-functionality.sh"

MAX_ITERATIONS=10
FAILURE_THRESHOLD=3

echo "🔄 Phase 4 Test Runner with Retry Logic"
echo "========================================"
echo "Max iterations: $MAX_ITERATIONS"
echo "Skip after $FAILURE_THRESHOLD consecutive failures"
echo ""

if [ ! -f "$PHASE4_SCRIPT" ]; then
  echo "❌ Phase 4 script not found: $PHASE4_SCRIPT"
  echo "Run story-qa-automation.sh first to generate tests"
  exit 1
fi

# Track failures per test
declare -A FAILURE_COUNT

for ITERATION in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "🔄 Iteration $ITERATION/$MAX_ITERATIONS"
  echo "=========================="
  echo ""
  
  # Run Phase 4 tests
  if bash "$PHASE4_SCRIPT" 2>&1 | tee "/tmp/phase4-run-$ITERATION.log"; then
    echo ""
    echo "✅ All Phase 4 tests passed!"
    echo "🎉 Test automation complete after $ITERATION iteration(s)"
    exit 0
  else
    echo ""
    echo "❌ Phase 4 tests failed"
    
    # Parse failures from log
    FAILED_TESTS=$(grep "❌" "/tmp/phase4-run-$ITERATION.log" | wc -l)
    echo "   Failed tests: $FAILED_TESTS"
    
    if [ $ITERATION -eq $MAX_ITERATIONS ]; then
      echo ""
      echo "⚠️  Reached maximum iterations ($MAX_ITERATIONS)"
      echo "   Some tests still failing - manual intervention required"
      exit 1
    fi
    
    echo ""
    echo "🛠️  Manual Intervention Required"
    echo "   Review failures in: /tmp/phase4-run-$ITERATION.log"
    echo "   Fix the issues, then press ENTER to continue..."
    echo "   Or press Ctrl+C to abort"
    read -r
  fi
done

echo ""
echo "⚠️  Test automation incomplete after $MAX_ITERATIONS iterations"
exit 1
