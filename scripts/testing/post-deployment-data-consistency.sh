#!/bin/bash
# Post-deployment data consistency validation

set -e

# Import shared test functions
source "$(dirname "$0")/test-functions.sh"

PHASE_PASSED=0
PHASE_FAILED=0

echo "📊 Post-Deployment Data Consistency Validation"
echo ""

# Use shared test function
test_data_consistency

echo ""
echo "📊 Data Consistency Results: ✅ $PHASE_PASSED passed, ❌ $PHASE_FAILED failed"

if [[ $PHASE_FAILED -gt 0 ]]; then
    echo "⚠️  Data consistency issues detected - database copy may have failed"
    exit 1
else
    echo "🎉 All data consistency checks passed"
    exit 0
fi
