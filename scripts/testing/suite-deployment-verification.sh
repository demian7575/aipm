#!/bin/bash
# Code Generation & Deployment Verification Suite
# Tests critical functionality after code generation and deployment

set -e
source "$(dirname "$0")/test-library.sh"

# Configuration
API_BASE="${API_BASE:-http://44.197.204.18:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://44.197.204.18:8083}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"

echo "🚀 Code Generation & Deployment Verification"
echo "Environment: $API_BASE"
echo ""

# Critical checks for deployment
test_deployment_health "$API_BASE" "$FRONTEND_URL"
test_version_consistency "$API_BASE"
test_api_security_headers "$API_BASE"
test_database_connection "$API_BASE"

# Core functionality
test_story_crud "$API_BASE"
test_api_response_time "$API_BASE" 5

# Code generation specific
test_semantic_api_health "$SEMANTIC_API_BASE"
test_code_generation_endpoint "$SEMANTIC_API_BASE"

# Summary
echo ""
if [[ $PHASE_FAILED -eq 0 ]]; then
    echo "✅ Deployment verification PASSED"
    exit 0
else
    echo "❌ Deployment verification FAILED ($PHASE_FAILED tests)"
    exit 1
fi
