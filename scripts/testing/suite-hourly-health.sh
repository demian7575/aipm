#!/bin/bash
# Hourly Health Check Suite
# Quick smoke tests to verify system is operational

set -e
source "$(dirname "$0")/test-library.sh"

# Configuration
API_BASE="${API_BASE:-http://3.92.96.67:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://3.92.96.67:8083}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"

echo "⏰ Hourly Health Check - $(date)"
echo ""

# Quick health checks (< 30 seconds)
test_api_security_headers "$API_BASE"
test_database_connection "$API_BASE"
test_api_response_time "$API_BASE" 5
test_frontend_availability "$FRONTEND_URL"
test_semantic_api_health "$SEMANTIC_API_BASE"

# Summary
echo ""
if [[ $PHASE_FAILED -eq 0 ]]; then
    echo "✅ Hourly check PASSED - System healthy"
    exit 0
else
    echo "⚠️ Hourly check FAILED - $PHASE_FAILED issues detected"
    exit 1
fi
