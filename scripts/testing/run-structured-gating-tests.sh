#!/bin/bash
# AIPM Structured Gating Tests - Main Runner
# Based on systematic architecture analysis and structured plan

set -e

# Configuration
PROD_API_BASE="http://44.220.45.57"
DEV_API_BASE="http://44.222.168.46"
KIRO_API_BASE="http://44.220.45.57:8081"
PROD_FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
DEV_FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

# Test counters
TOTAL_PASSED=0
TOTAL_FAILED=0
PHASE_PASSED=0
PHASE_FAILED=0

# Utility functions
log_phase() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    PHASE_PASSED=0
    PHASE_FAILED=0
}

log_test() {
    echo "  🧪 $1"
}

pass_test() {
    echo "    ✅ $1"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
    PHASE_PASSED=$((PHASE_PASSED + 1))
}

fail_test() {
    echo "    ❌ $1"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
    PHASE_FAILED=$((PHASE_FAILED + 1))
    return 1
}

phase_summary() {
    local phase_name=$1
    echo ""
    echo "📊 $phase_name Summary: ✅ $PHASE_PASSED passed, ❌ $PHASE_FAILED failed"
    
    if [[ $PHASE_FAILED -gt 0 ]]; then
        echo "⚠️  $phase_name has failures - review before proceeding"
        return 1
    else
        echo "🎉 $phase_name completed successfully"
        return 0
    fi
}

# Main execution
main() {
    echo "🧪 AIPM Structured Gating Tests"
    echo "Based on systematic architecture analysis"
    echo ""
    
    # Phase 1: Critical Security & Data Safety
    log_phase "🔴 PHASE 1: Critical Security & Data Safety"
    
    if ./scripts/testing/phase1-security-data-safety.sh; then
        phase_summary "Phase 1"
    else
        phase_summary "Phase 1"
        echo "🚫 BLOCKING DEPLOYMENT - Critical security/data issues detected"
        exit 1
    fi
    
    # Phase 2: Performance & API Safety  
    log_phase "🟡 PHASE 2: Performance & API Safety"
    
    if ./scripts/testing/phase2-performance-api.sh; then
        phase_summary "Phase 2"
    else
        phase_summary "Phase 2"
        echo "⚠️  Performance/API issues detected - consider fixing before deployment"
    fi
    
    # Phase 3: Infrastructure & Monitoring
    log_phase "🟢 PHASE 3: Infrastructure & Monitoring"
    
    if ./scripts/testing/phase3-infrastructure-monitoring.sh; then
        phase_summary "Phase 3"
    else
        phase_summary "Phase 3"
        echo "ℹ️  Infrastructure/monitoring issues detected - non-blocking"
    fi
    
    # Final summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 FINAL GATING TEST RESULTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Total Tests Passed: $TOTAL_PASSED"
    echo "❌ Total Tests Failed: $TOTAL_FAILED"
    echo "📈 Total Tests Run: $((TOTAL_PASSED + TOTAL_FAILED))"
    echo ""
    
    if [[ $TOTAL_FAILED -eq 0 ]]; then
        echo "🎉 ALL GATING TESTS PASSED!"
        echo "✅ System approved for deployment"
        exit 0
    else
        echo "⚠️  Some tests failed"
        echo "📋 Review failures and fix critical issues before deployment"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
