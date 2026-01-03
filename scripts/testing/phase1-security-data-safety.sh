#!/bin/bash
# Phase 1: Critical Security & Data Safety Tests
# Priority: 🔴 Critical - BLOCKS deployment on failure

set -e

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo "  🧪 $1"
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

# 1.1 Security Validation Tests
test_security_validation() {
    echo "🔒 Security Validation Tests"
    
    # GitHub token validation
    log_test "GitHub token permissions"
    if [[ -n "$GITHUB_TOKEN" ]]; then
        REPO_ACCESS=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/repos/demian7575/aipm" | jq -r '.permissions.push // false')
        
        if [[ "$REPO_ACCESS" == "true" ]]; then
            pass_test "GitHub token has required permissions"
        else
            fail_test "GitHub token lacks push permissions"
        fi
    else
        fail_test "GITHUB_TOKEN not configured"
    fi
    
    # AWS IAM validation
    log_test "AWS IAM permissions"
    if aws sts get-caller-identity >/dev/null 2>&1; then
        if aws dynamodb describe-table --table-name aipm-backend-prod-stories >/dev/null 2>&1; then
            pass_test "AWS has DynamoDB access"
        else
            fail_test "AWS lacks DynamoDB access"
        fi
        
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
    EXPOSED_SECRETS=$(env | grep -i "token\|key\|secret" | grep -v "GITHUB_TOKEN" | wc -l)
    if [[ "$EXPOSED_SECRETS" -eq 0 ]]; then
        pass_test "No exposed secrets in environment"
    else
        fail_test "Potential secrets exposed: $EXPOSED_SECRETS variables"
    fi
}

# 1.2 Database Integrity Tests
test_database_integrity() {
    echo ""
    echo "🗄️ Database Integrity Tests"
    
    # Schema validation
    log_test "DynamoDB table schema consistency"
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
    log_test "Data consistency validation"
    PROD_COUNT=$(aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_COUNT=$(aws dynamodb scan --table-name aipm-backend-dev-stories --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    DIFF=$((PROD_COUNT - DEV_COUNT))
    ABS_DIFF=${DIFF#-}
    
    if [[ $ABS_DIFF -lt 10 ]]; then
        pass_test "Data counts consistent (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    else
        fail_test "Large data discrepancy (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    fi
    
    # Table capacity validation
    log_test "DynamoDB billing mode validation"
    PROD_BILLING=$(aws dynamodb describe-table --table-name aipm-backend-prod-stories \
        --query 'Table.BillingModeSummary.BillingMode' --output text 2>/dev/null || echo "UNKNOWN")
    
    if [[ "$PROD_BILLING" == "PAY_PER_REQUEST" ]]; then
        pass_test "Production using on-demand billing"
    else
        fail_test "Production not using optimal billing: $PROD_BILLING"
    fi
}

# 1.3 Deployment Safety Tests
test_deployment_safety() {
    echo ""
    echo "🔄 Deployment Safety Tests"
    
    # Git repository state
    log_test "Git repository state validation"
    if git status --porcelain | grep -q .; then
        fail_test "Repository has uncommitted changes"
    else
        pass_test "Repository is clean for deployment"
    fi
    
    # Branch protection validation
    log_test "Branch protection rules"
    if [[ -n "$GITHUB_TOKEN" ]]; then
        PROTECTION=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/repos/demian7575/aipm/branches/main/protection" 2>/dev/null || echo '{}')
        
        # Check for deployment protection
        DEPLOYMENT_PROTECTION=$(echo "$PROTECTION" | jq -r '.required_deployment_environments // []' | jq length)
        
        if echo "$PROTECTION" | grep -q "required_status_checks"; then
            if [[ "$DEPLOYMENT_PROTECTION" -gt 0 ]]; then
                pass_test "Main branch has deployment-based protection"
            else
                pass_test "Main branch has basic protection (consider adding deployment requirements)"
            fi
        else
            fail_test "Main branch lacks protection rules"
        fi
    else
        fail_test "Cannot validate branch protection - no GitHub token"
    fi
    
    # Deployment artifacts validation
    log_test "Deployment artifacts validation"
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
        fail_test "Missing artifacts: ${MISSING_FILES[*]}"
    fi
    
    # Service health validation
    log_test "Pre-deployment service health"
    if curl -s -m 5 "http://44.220.45.57/api/stories" | grep -q "\["; then
        pass_test "Production services healthy"
    else
        fail_test "Production services unhealthy - risky deployment"
    fi
}

# Main execution
main() {
    echo "🔴 Phase 1: Critical Security & Data Safety"
    echo ""
    
    test_security_validation || true
    test_database_integrity || true
    test_deployment_safety || true
    
    echo ""
    echo "📊 Phase 1 Results: ✅ $TESTS_PASSED passed, ❌ $TESTS_FAILED failed"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo "🎉 Phase 1 completed successfully"
        exit 0
    else
        echo "🚫 Phase 1 FAILED - Critical issues must be resolved"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
