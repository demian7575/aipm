#!/bin/bash
# Critical Security & Data Safety Gating Tests
# Addresses highest priority gaps identified in gap analysis

set -e

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo "  🧪 Testing: $1"
}

pass_test() {
    echo "    ✅ $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail_test() {
    echo "    ❌ $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
}

# 1. Security & Authentication Tests
test_security_validation() {
    echo "🔒 Testing Security & Authentication"
    
    # GitHub token validation
    log_test "GitHub token permissions"
    if [[ -n "$GITHUB_TOKEN" ]]; then
        # Test token has required permissions
        REPO_ACCESS=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/repos/demian7575/aipm" | jq -r '.permissions.push // false')
        
        if [[ "$REPO_ACCESS" == "true" ]]; then
            pass_test "GitHub token has push permissions"
        else
            fail_test "GitHub token lacks required permissions"
        fi
    else
        fail_test "GITHUB_TOKEN not configured"
    fi
    
    # AWS IAM validation
    log_test "AWS IAM permissions"
    if aws sts get-caller-identity >/dev/null 2>&1; then
        # Test DynamoDB access
        if aws dynamodb describe-table --table-name aipm-backend-prod-stories >/dev/null 2>&1; then
            pass_test "AWS has DynamoDB access"
        else
            fail_test "AWS lacks DynamoDB access"
        fi
        
        # Test S3 access
        if aws s3 ls s3://aipm-deployments-728378229251/ >/dev/null 2>&1; then
            pass_test "AWS has S3 access"
        else
            fail_test "AWS lacks S3 access"
        fi
    else
        fail_test "AWS credentials not configured"
    fi
    
    # Environment variable security
    log_test "Environment variable security"
    if env | grep -i "token\|key\|secret" | grep -v "GITHUB_TOKEN" | wc -l | grep -q "^0$"; then
        pass_test "No exposed secrets in environment"
    else
        fail_test "Potential secrets exposed in environment"
    fi
}

# 2. Database Integrity Tests
test_database_integrity() {
    echo "🗄️ Testing Database Integrity"
    
    # Schema validation
    log_test "DynamoDB table schema"
    PROD_SCHEMA=$(aws dynamodb describe-table --table-name aipm-backend-prod-stories \
        --query 'Table.AttributeDefinitions' --output json 2>/dev/null || echo '[]')
    DEV_SCHEMA=$(aws dynamodb describe-table --table-name aipm-backend-dev-stories \
        --query 'Table.AttributeDefinitions' --output json 2>/dev/null || echo '[]')
    
    if [[ "$PROD_SCHEMA" == "$DEV_SCHEMA" ]]; then
        pass_test "Production and development schemas match"
    else
        fail_test "Schema mismatch between prod and dev"
    fi
    
    # Data consistency checks
    log_test "Data consistency between environments"
    PROD_COUNT=$(aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_COUNT=$(aws dynamodb scan --table-name aipm-backend-dev-stories --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    # Allow some variance but flag major discrepancies
    DIFF=$((PROD_COUNT - DEV_COUNT))
    ABS_DIFF=${DIFF#-}  # Absolute value
    
    if [[ $ABS_DIFF -lt 10 ]]; then
        pass_test "Data counts reasonably consistent (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    else
        fail_test "Large data discrepancy (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    fi
    
    # Table capacity validation
    log_test "DynamoDB table capacity"
    PROD_CAPACITY=$(aws dynamodb describe-table --table-name aipm-backend-prod-stories \
        --query 'Table.BillingModeSummary.BillingMode' --output text 2>/dev/null || echo "UNKNOWN")
    
    if [[ "$PROD_CAPACITY" == "PAY_PER_REQUEST" ]]; then
        pass_test "Production table using on-demand billing"
    else
        fail_test "Production table not using optimal billing mode: $PROD_CAPACITY"
    fi
}

# 3. Rollback & Deployment Safety Tests
test_rollback_safety() {
    echo "🔄 Testing Rollback & Deployment Safety"
    
    # Git repository state validation
    log_test "Git repository safety"
    if git status --porcelain | grep -q .; then
        fail_test "Repository has uncommitted changes - unsafe for deployment"
    else
        pass_test "Repository is clean for deployment"
    fi
    
    # Branch protection validation
    log_test "Branch protection rules"
    BRANCH_PROTECTION=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        "https://api.github.com/repos/demian7575/aipm/branches/main/protection" 2>/dev/null || echo '{}')
    
    if echo "$BRANCH_PROTECTION" | grep -q "required_status_checks"; then
        pass_test "Main branch has protection rules"
    else
        fail_test "Main branch lacks protection rules"
    fi
    
    # Deployment artifact validation
    log_test "Deployment artifacts"
    REQUIRED_FILES=("apps/backend/app.js" "apps/backend/server.js" "apps/frontend/public/index.html")
    MISSING_FILES=()
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            MISSING_FILES+=("$file")
        fi
    done
    
    if [[ ${#MISSING_FILES[@]} -eq 0 ]]; then
        pass_test "All deployment artifacts present"
    else
        fail_test "Missing deployment artifacts: ${MISSING_FILES[*]}"
    fi
    
    # Service health before deployment
    log_test "Pre-deployment service health"
    if curl -s "http://44.220.45.57/health" | grep -q "running"; then
        pass_test "Production services healthy before deployment"
    else
        fail_test "Production services unhealthy - deployment risky"
    fi
}

# Main execution
run_critical_gating_tests() {
    echo "🚨 Critical Security & Data Safety Gating Tests"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    test_security_validation || true
    echo ""
    
    test_database_integrity || true
    echo ""
    
    test_rollback_safety || true
    echo ""
    
    # Summary
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Critical Tests Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Tests Passed: $TESTS_PASSED"
    echo "❌ Tests Failed: $TESTS_FAILED"
    echo "📈 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo ""
        echo "🎉 All critical gating tests passed!"
        echo "✅ System meets security and data safety requirements"
        exit 0
    else
        echo ""
        echo "⚠️  Critical tests failed - BLOCKING DEPLOYMENT"
        echo "❌ Fix security and data safety issues before proceeding"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_critical_gating_tests "$@"
fi
