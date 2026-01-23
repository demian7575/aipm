#!/bin/bash
# Phase 4: Functionality Tests
# This file accumulates all story-specific acceptance tests
# Each merged user story should add its test cases here

set -e
source "$(dirname "$0")/test-library.sh"

echo "🟢 Phase 4: Functionality Tests"
echo "Testing acceptance criteria for all merged stories"
echo ""

# Counter for test results
PHASE4_PASSED=0
PHASE4_FAILED=0

# =============================================================================
# Story: Remove Hide Completed Button
# ID: 1768754109973
# Merged: 2026-01-22
# =============================================================================
test_remove_hide_completed_button() {
    log_test "Remove Hide Completed Button"
    
    # Test 1: Verify Hide Completed button is removed
    if grep -qi "hide.*completed" apps/frontend/public/index.html 2>/dev/null; then
        fail_test "Hide Completed button still exists in HTML"
        return 1
    fi
    
    # Test 2: Verify hideCompleted state is removed from code
    if grep -q "state.hideCompleted" apps/frontend/public/app.js 2>/dev/null; then
        fail_test "state.hideCompleted still referenced in app.js"
        return 1
    fi
    
    # Test 3: Verify syncHideCompletedControls is removed
    if grep -q "syncHideCompletedControls" apps/frontend/public/app.js 2>/dev/null; then
        fail_test "syncHideCompletedControls still referenced in app.js"
        return 1
    fi
    
    pass_test "Remove Hide Completed Button"
    return 0
}

# =============================================================================
# ADD NEW STORY TESTS BELOW THIS LINE
# Template:

# =============================================================================
# Story: Updated: User Authentication with OAuth2
# ID: 1769158322769
# Merged: 2026-01-23
# =============================================================================
test_updated_user_authentication_with_oauth2() {
    log_test "Updated: User Authentication with OAuth2"
    
    # Test 1: OAuth2 module exists
    if [[ ! -f "apps/backend/oauth.js" ]]; then
        fail_test "OAuth2 module not found"
        return 1
    fi
    
    # Test 2: OAuth2 module exports required functions
    if ! grep -q "getAuthorizationUrl" apps/backend/oauth.js; then
        fail_test "getAuthorizationUrl function not found"
        return 1
    fi
    
    if ! grep -q "exchangeCodeForToken" apps/backend/oauth.js; then
        fail_test "exchangeCodeForToken function not found"
        return 1
    fi
    
    if ! grep -q "validateSession" apps/backend/oauth.js; then
        fail_test "validateSession function not found"
        return 1
    fi
    
    # Test 3: OAuth2 supports multiple providers
    if ! grep -q "google\|github\|microsoft" apps/backend/oauth.js; then
        fail_test "OAuth2 providers not configured"
        return 1
    fi
    
    pass_test "Updated: User Authentication with OAuth2"
    return 0
}
# =============================================================================
# Story: [Story Title]
# ID: [Story ID]
# Merged: [Date]
# =============================================================================
# test_story_name() {
#     log_test "[Story Title]"
#     
#     # Test 1: [Description]
#     # Add your test logic here
#     
#     pass_test "[Story Title]"
#     return 0
# }
# =============================================================================

# Run all tests
echo "Running all Phase 4 functionality tests..."
echo ""

if test_remove_hide_completed_button; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

# ADD NEW TEST FUNCTION CALLS HERE
if test_updated_user_authentication_with_oauth2; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi

# if test_your_story_name; then
#     ((PHASE4_PASSED++))
# else
#     ((PHASE4_FAILED++))
# fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 4 Summary:"
echo "  ✅ Passed: $PHASE4_PASSED"
echo "  ❌ Failed: $PHASE4_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $PHASE4_FAILED -gt 0 ]]; then
    echo "❌ Phase 4 failed: $PHASE4_FAILED test(s) failed"
    exit 1
fi

echo "✅ Phase 4 completed: all tests passed"
exit 0
