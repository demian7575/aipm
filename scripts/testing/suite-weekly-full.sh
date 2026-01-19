#!/bin/bash
# Weekly Full Validation Suite
# Complete end-to-end testing including user journeys

set -e
source "$(dirname "$0")/test-library.sh"

# Configuration
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
TARGET_ENV="${TARGET_ENV:-prod}"

echo "📆 Weekly Full Validation - $(date)"
echo "Environment: $TARGET_ENV"
echo ""

# Phase 1: Security & Data Safety
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 Phase 1: Security & Data Safety"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_api_security_headers "$API_BASE"
test_database_connection "$API_BASE"
test_version_endpoint "$API_BASE"

# Phase 2: Performance & API
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟡 Phase 2: Performance & API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_api_response_time "$API_BASE" 5
test_kiro_api_health "$KIRO_API_BASE"
test_draft_generation_performance "$KIRO_API_BASE"

# Phase 3: Infrastructure
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🟢 Phase 3: Infrastructure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_frontend_availability "$FRONTEND_URL"
test_s3_config "$FRONTEND_URL" "$TARGET_ENV"
test_network_connectivity "$API_BASE"

# Phase 4: Workflows
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Phase 4: Workflows"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_story_crud "$API_BASE"
test_invest_analysis "$API_BASE" "$KIRO_API_BASE"
test_health_check "$API_BASE"
test_code_generation_endpoint "$KIRO_API_BASE"

# Phase 5: End-to-End Journey
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Phase 5: End-to-End Journey"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_complete_user_journey "$API_BASE"

# Deployment Verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deployment Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_deployment_health "$API_BASE" "$FRONTEND_URL"
test_version_consistency "$API_BASE"

# Final Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Weekly Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PHASE_PASSED"
echo "❌ Failed: $PHASE_FAILED"
echo "📈 Total: $((PHASE_PASSED + PHASE_FAILED))"
echo "📅 Date: $(date)"
echo "🌍 Environment: $TARGET_ENV"

if [[ $PHASE_FAILED -eq 0 ]]; then
    echo ""
    echo "✅ Weekly validation PASSED - System fully operational"
    exit 0
else
    echo ""
    echo "⚠️ Weekly validation FAILED - $PHASE_FAILED issues require immediate attention"
    exit 1
fi
