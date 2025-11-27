#!/bin/bash

# AIPM Deployment Gating Tests Runner

set -e

ENVIRONMENT=${1:-all}

echo "🧪 Running AIPM Deployment Gating Tests"
echo "Environment: $ENVIRONMENT"
echo "================================"

# Function to run tests for specific environment
run_env_tests() {
    local env=$1
    echo "🔍 Testing $env environment..."
    
    if [ "$env" = "dev" ]; then
        npm run test:dev-gating
    elif [ "$env" = "prod" ]; then
        npm run test:prod-gating
    fi
}

# Function to run all deployment gating tests
run_all_tests() {
    echo "🔍 Running comprehensive deployment gating tests..."
    node --test tests/deployment-gating.test.js
}

# Main execution
case $ENVIRONMENT in
    "dev")
        run_env_tests "dev"
        ;;
    "prod")
        run_env_tests "prod"
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo "Usage: $0 [dev|prod|all]"
        echo ""
        echo "Options:"
        echo "  dev   - Test development environment only"
        echo "  prod  - Test production environment only"
        echo "  all   - Test both environments and isolation (default)"
        exit 1
        ;;
esac

echo ""
echo "✅ Gating tests completed successfully!"
echo "All deployment components are working correctly."
