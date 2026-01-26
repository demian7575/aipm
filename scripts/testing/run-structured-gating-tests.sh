#!/bin/bash
# AIPM Structured Gating Tests - Main Runner
# Based on systematic architecture analysis and structured plan

set -e

# Prevent nested gating test execution in code generation
export SKIP_GATING_TESTS=true

# Parse command line arguments
PHASES_TO_RUN="1,2"
TARGET_ENV="prod"
while [[ $# -gt 0 ]]; do
    case $1 in
        --phases)
            PHASES_TO_RUN="$2"
            shift 2
            ;;
        --env)
            TARGET_ENV="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Import shared test functions
source "$(dirname "$0")/test-functions.sh"

# Initialize test counter directory
export TEST_COUNTER_DIR="/tmp/aipm-test-$$"
mkdir -p "$TEST_COUNTER_DIR"
reset_test_counters

# Validate required environment variables
if [[ -z "$API_BASE" ]]; then
    echo "❌ Error: API_BASE environment variable is not set"
    exit 1
fi

if [[ -z "$SEMANTIC_API_BASE" ]]; then
    echo "❌ Error: SEMANTIC_API_BASE environment variable is not set"
    exit 1
fi

if [[ -z "$TARGET_ENV" ]]; then
    echo "❌ Error: TARGET_ENV environment variable is not set"
    exit 1
fi

# Configuration based on target environment
if [[ "$TARGET_ENV" == "dev" ]]; then
    FRONTEND_URL="${FRONTEND_URL:-http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com}"
    echo "🔧 Target Environment: DEVELOPMENT"
else
    FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
    echo "🔧 Target Environment: PRODUCTION"
fi

# Legacy variables for backward compatibility
PROD_API_BASE="$API_BASE"
DEV_API_BASE="http://44.222.168.46:4000"
PROD_FRONTEND_URL="$FRONTEND_URL"
DEV_FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

# Export for phase scripts
export API_BASE SEMANTIC_API_BASE FRONTEND_URL TARGET_ENV

# Utility functions
log_phase() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    reset_test_counters
}

phase_summary() {
    local phase_name=$1
    local phase_passed=$(get_passed_count)
    local phase_failed=$(get_failed_count)
    
    echo ""
    echo "📊 $phase_name Summary: ✅ $phase_passed passed, ❌ $phase_failed failed"
    
    if [[ $phase_failed -gt 0 ]]; then
        echo "⚠️  $phase_name has failures - review before proceeding"
    else
        echo "🎉 $phase_name completed successfully"
    fi
}

# Main execution
main() {
    local test_start=$(date +%s)
    
    echo "🧪 AIPM Structured Gating Tests"
    echo "Based on systematic architecture analysis"
    echo ""
    
    # Check if phase should run
    should_run_phase() {
        local phase=$1
        [[ ",$PHASES_TO_RUN," == *",$phase,"* ]]
    }
    
    # Phase 1: Critical Security & Data Safety
    if should_run_phase 1; then
        log_phase "🔴 PHASE 1: Critical Security & Data Safety"
        local phase1_start=$(date +%s)
        
        if source ./scripts/testing/phase1-security-data-safety.sh; then
            local phase1_end=$(date +%s)
            local phase1_duration=$((phase1_end - phase1_start))
            phase_summary "Phase 1"
            echo "⏱️  Phase 1 Duration: ${phase1_duration}s"
        else
            phase_summary "Phase 1"
            echo "🚫 BLOCKING DEPLOYMENT - Critical security/data issues detected"
            exit 1
        fi
    fi
    
    # Phase 2: UI-Driven Complete E2E Workflow
    if should_run_phase 2; then
        log_phase "🎯 PHASE 2: UI-Driven Complete E2E Workflow"
        local phase2_start=$(date +%s)
        
        if source ./scripts/testing/phase2-e2e-workflow.sh; then
            local phase2_end=$(date +%s)
            local phase2_duration=$((phase2_end - phase2_start))
            phase_summary "Phase 2"
            echo "⏱️  Phase 2 Duration: ${phase2_duration}s"
        else
            phase_summary "Phase 2"
            echo "⚠️  Workflow issues detected - review complete workflow"
        fi
    fi
    
    # Phase 3: Real Integration Tests
    if should_run_phase 3; then
        log_phase "🔗 PHASE 3: Real Integration Tests"
        local phase3_start=$(date +%s)
        
        if source ./scripts/testing/real-phase3-tests.sh; then
            local phase3_end=$(date +%s)
            local phase3_duration=$((phase3_end - phase3_start))
            phase_summary "Phase 3"
            echo "⏱️  Phase 3 Duration: ${phase3_duration}s"
        else
            phase_summary "Phase 3"
            echo "⚠️  Integration issues detected"
        fi
    fi
    
    # Phase 4: End-to-End Workflow Tests + Story-specific Tests
    if should_run_phase 4; then
        log_phase "🔄 PHASE 4: End-to-End Workflow Tests"
        local phase4_start=$(date +%s)
        
        # Run base Phase 4 tests
        if source ./scripts/testing/real-phase4-tests.sh; then
            phase_summary "Phase 4 (Base)"
        else
            phase_summary "Phase 4 (Base)"
            echo "⚠️  Base workflow issues detected"
        fi
        
        # Run accumulated Phase 4 functionality tests
        echo ""
        echo "🧪 Running Phase 4 Functionality Tests..."
        
        if [[ -f ./scripts/testing/phase4-functionality.sh ]]; then
            if bash ./scripts/testing/phase4-functionality.sh; then
                echo "✅ Phase 4 Functionality Tests passed"
            else
                echo "❌ Phase 4 Functionality Tests failed"
                ((PHASE_FAILED++))
            fi
        else
            echo "⚠️  Phase 4 functionality test file not found"
        fi
        
        local phase4_end=$(date +%s)
        local phase4_duration=$((phase4_end - phase4_start))
        echo "⏱️  Phase 4 Duration: ${phase4_duration}s"
    fi
    
    # Phase 5: Code Generation Workflow
    if should_run_phase 5; then
        log_phase "🤖 PHASE 5: Code Generation Workflow"
        local phase5_start=$(date +%s)
        
        if source ./scripts/testing/real-phase5-tests.sh; then
            local phase5_end=$(date +%s)
            local phase5_duration=$((phase5_end - phase5_start))
            phase_summary "Phase 5"
            echo "⏱️  Phase 5 Duration: ${phase5_duration}s"
        else
            phase_summary "Phase 5"
            echo "⚠️  Code generation issues detected"
        fi
    fi
    
    # Phase 6: UI-Driven Complete Workflow
    if should_run_phase 6; then
        log_phase "🎯 PHASE 6: UI-Driven Complete Workflow"
        local phase6_start=$(date +%s)
        
        if source ./scripts/testing/phase6-ui-workflow.sh; then
            local phase6_end=$(date +%s)
            local phase6_duration=$((phase6_end - phase6_start))
            phase_summary "Phase 6"
            echo "⏱️  Phase 6 Duration: ${phase6_duration}s"
        else
            phase_summary "Phase 6"
            echo "⚠️  UI workflow issues detected"
        fi
    fi
    
    # Final summary
    local test_end=$(date +%s)
    local total_duration=$((test_end - test_start))
    local total_passed=$(get_passed_count)
    local total_failed=$(get_failed_count)
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 FINAL GATING TEST RESULTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Total Tests Passed: $total_passed"
    echo "❌ Total Tests Failed: $total_failed"
    echo "📈 Total Tests Run: $((total_passed + total_failed))"
    echo "⏱️  Total Duration: ${total_duration}s ($(printf '%dm %ds' $((total_duration/60)) $((total_duration%60))))"
    echo ""
    
    # Cleanup
    rm -rf "$TEST_COUNTER_DIR"
    
    if [[ $total_failed -eq 0 ]]; then
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
