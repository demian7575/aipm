#!/bin/bash
# Configurable test runner - customize tests per use case

set -e

# Default test configuration
DEFAULT_TESTS=(
    "security_data_validation"
    "deployment_safety" 
    "performance_api_safety"
    "infrastructure_monitoring"
    "workflow_validation"
)

# Load custom test configuration if provided
if [ -f "test-config.json" ]; then
    echo "📋 Loading custom test configuration..."
    CUSTOM_TESTS=($(jq -r '.tests[]' test-config.json))
    TESTS=("${CUSTOM_TESTS[@]}")
else
    TESTS=("${DEFAULT_TESTS[@]}")
fi

echo "🧪 Running ${#TESTS[@]} configured tests..."

# Test counters
TOTAL_PASSED=0
TOTAL_FAILED=0

# Individual test functions
security_data_validation() {
    echo "🔒 Security & Data Validation"
    # Run security tests
    ./scripts/testing/tests/security-tests.sh
}

deployment_safety() {
    echo "🛡️  Deployment Safety"
    # Run deployment safety tests
    ./scripts/testing/tests/deployment-tests.sh
}

performance_api_safety() {
    echo "⚡ Performance & API Safety"
    # Run performance tests
    ./scripts/testing/tests/performance-tests.sh
}

infrastructure_monitoring() {
    echo "🏗️  Infrastructure & Monitoring"
    # Run infrastructure tests
    ./scripts/testing/tests/infrastructure-tests.sh
}

workflow_validation() {
    echo "🔄 Workflow Validation"
    # Run workflow tests
    ./scripts/testing/tests/workflow-tests.sh
}

# Run configured tests
for test in "${TESTS[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if $test; then
        echo "✅ $test passed"
        ((TOTAL_PASSED++))
    else
        echo "❌ $test failed"
        ((TOTAL_FAILED++))
    fi
done

# Summary
echo ""
echo "📊 Test Results: ✅ $TOTAL_PASSED passed, ❌ $TOTAL_FAILED failed"

if [ $TOTAL_FAILED -gt 0 ]; then
    exit 1
fi
