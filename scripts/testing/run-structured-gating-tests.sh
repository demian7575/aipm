#!/bin/bash
# AIPM Structured Gating Tests - Main Runner
# Based on systematic architecture analysis and structured plan

set -e

# Parse command line arguments
PHASES_TO_RUN="1,2,3,4,5"
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

# Configuration based on target environment
if [[ "$TARGET_ENV" == "dev" ]]; then
    SSH_HOST="${SSH_HOST:-44.222.168.46}"
    API_BASE="${API_BASE:-http://localhost:4000}"
    SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://localhost:8083}"
    FRONTEND_URL="${FRONTEND_URL:-http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com}"
    echo "🔧 Target Environment: DEVELOPMENT"
else
    SSH_HOST="${SSH_HOST:-3.92.96.67}"
    API_BASE="${API_BASE:-http://localhost:4000}"
    SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://localhost:8083}"
    FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
    echo "🔧 Target Environment: PRODUCTION"
fi

# Legacy variables for backward compatibility
PROD_API_BASE="$API_BASE"
DEV_API_BASE="http://44.222.168.46:4000"
PROD_FRONTEND_URL="$FRONTEND_URL"
DEV_FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

# Export for phase scripts
export API_BASE SEMANTIC_API_BASE FRONTEND_URL TARGET_ENV SSH_HOST

# Helper to run commands on remote server
run_remote() {
    ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@$SSH_HOST "$@" 2>/dev/null
}

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
    
    # Phase 2-1: Kiro CLI Mock Tests
    if should_run_phase 2.1 || should_run_phase 2; then
        log_phase "🧪 PHASE 2-1: Kiro CLI Mock Tests"
        local phase21_start=$(date +%s)
        
        if source ./scripts/testing/phase2-1-kiro-mock-tests.sh; then
            local phase21_end=$(date +%s)
            local phase21_duration=$((phase21_end - phase21_start))
            phase_summary "Phase 2-1"
            echo "⏱️  Phase 2-1 Duration: ${phase21_duration}s"
        else
            phase_summary "Phase 2-1"
            echo "⚠️  Mock test issues detected - check endpoint availability"
        fi
    fi
    
    # Phase 2: Complete User Workflow
    if should_run_phase 2; then
        log_phase "🎯 PHASE 2: Complete User Workflow (Step-by-Step)"
        local phase2_start=$(date +%s)
        
        if source ./scripts/testing/phase2-performance-api.sh; then
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
        
        # Run story-specific Phase 4 tests
        echo ""
        echo "🧪 Running story-specific acceptance tests..."
        local story_tests_passed=0
        local story_tests_failed=0
        
        for test_file in ./scripts/testing/phase4-story-*.sh; do
            if [[ -f "$test_file" ]]; then
                local story_id=$(basename "$test_file" | sed 's/phase4-story-\(.*\)\.sh/\1/')
                echo "  📝 Testing story $story_id..."
                
                if bash "$test_file"; then
                    ((story_tests_passed++))
                else
                    ((story_tests_failed++))
                fi
            fi
        done
        
        if [[ $story_tests_passed -gt 0 || $story_tests_failed -gt 0 ]]; then
            echo "  ✅ Story tests passed: $story_tests_passed"
            echo "  ❌ Story tests failed: $story_tests_failed"
        else
            echo "  ℹ️  No story-specific tests found"
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
