#!/bin/bash
# Daily Comprehensive Test Suite
# Full system validation including workflows

set -e
source "$(dirname "$0")/test-library.sh"

# Configuration
API_BASE="${API_BASE:-http://44.197.204.18:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://44.197.204.18:8083}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
TARGET_ENV="${TARGET_ENV:-prod}"

echo "📅 Daily Comprehensive Test - $(date)"
echo "Environment: $TARGET_ENV"
echo ""

# Security & Infrastructure
echo "🔒 Security & Infrastructure"
test_api_security_headers "$API_BASE"
test_database_connection "$API_BASE"
test_version_endpoint "$API_BASE"
test_frontend_availability "$FRONTEND_URL"
test_s3_config "$FRONTEND_URL" "$TARGET_ENV"
test_network_connectivity "$API_BASE"

# Performance
echo ""
echo "⚡ Performance"
test_api_response_time "$API_BASE" 5
test_semantic_api_health "$SEMANTIC_API_BASE"
test_draft_generation_performance "$SEMANTIC_API_BASE"

# Workflows
echo ""
echo "🔄 Workflows"
test_story_crud "$API_BASE"
test_invest_analysis "$API_BASE" "$SEMANTIC_API_BASE"
test_health_check "$API_BASE"
test_code_generation_endpoint "$SEMANTIC_API_BASE"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Daily Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PHASE_PASSED"
echo "❌ Failed: $PHASE_FAILED"
echo "📈 Total: $((PHASE_PASSED + PHASE_FAILED))"

if [[ $PHASE_FAILED -eq 0 ]]; then
    echo ""
    echo "✅ Daily test PASSED - All systems operational"
    exit 0
else
    echo ""
    echo "⚠️ Daily test FAILED - $PHASE_FAILED issues require attention"
    exit 1
fi
