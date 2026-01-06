#!/bin/bash
# Shared test functions library - define once, use everywhere

# Test utilities
pass_test() {
    echo "    ✅ $1"
    if [[ -n "$PHASE_PASSED" ]]; then
        PHASE_PASSED=$((PHASE_PASSED + 1))
    elif [[ -n "$TESTS_PASSED" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

fail_test() {
    echo "    ❌ $1"
    if [[ -n "$PHASE_FAILED" ]]; then
        PHASE_FAILED=$((PHASE_FAILED + 1))
    elif [[ -n "$TESTS_FAILED" ]]; then
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    return 1
}

log_test() {
    echo "  🧪 $1"
}

# Reusable test functions
test_data_consistency() {
    log_test "Data consistency validation"
    
    # Stories consistency
    PROD_COUNT=$(aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_COUNT=$(aws dynamodb scan --table-name aipm-backend-dev-stories --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    DIFF=$((PROD_COUNT - DEV_COUNT))
    ABS_DIFF=${DIFF#-}
    
    if [[ $ABS_DIFF -lt 10 ]]; then
        pass_test "Stories data consistent (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    else
        fail_test "Stories data discrepancy (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    fi
    
    # Acceptance tests consistency
    PROD_TESTS=$(aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_TESTS=$(aws dynamodb scan --table-name aipm-backend-dev-acceptance-tests --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    TEST_DIFF=$((PROD_TESTS - DEV_TESTS))
    TEST_ABS_DIFF=${TEST_DIFF#-}
    
    if [[ $TEST_ABS_DIFF -lt 5 ]]; then
        pass_test "Acceptance tests consistent (Prod: $PROD_TESTS, Dev: $DEV_TESTS)"
    else
        fail_test "Acceptance tests discrepancy (Prod: $PROD_TESTS, Dev: $DEV_TESTS)"
    fi
    
    # PRs consistency
    PROD_PRS=$(aws dynamodb scan --table-name aipm-backend-prod-prs --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_PRS=$(aws dynamodb scan --table-name aipm-backend-dev-prs --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    PRS_DIFF=$((PROD_PRS - DEV_PRS))
    PRS_ABS_DIFF=${PRS_DIFF#-}
    
    if [[ $PRS_ABS_DIFF -lt 5 ]]; then
        pass_test "PRs data consistent (Prod: $PROD_PRS, Dev: $DEV_PRS)"
    else
        fail_test "PRs data discrepancy (Prod: $PROD_PRS, Dev: $DEV_PRS)"
    fi
}

test_git_repository_state() {
    log_test "Git repository state validation"
    if [[ -n "$GITHUB_ACTIONS" ]]; then
        pass_test "Skipping git state check in CI/CD environment"
    elif [[ -n "$GITHUB_HEAD_REF" ]]; then
        pass_test "PR deployment - uncommitted changes allowed"
    elif git status --porcelain | grep -q .; then
        fail_test "Repository has uncommitted changes"
    else
        pass_test "Repository is clean for deployment"
    fi
}

test_schema_consistency() {
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
}

test_billing_mode() {
    log_test "DynamoDB billing mode validation"
    PROD_BILLING=$(aws dynamodb describe-table --table-name aipm-backend-prod-stories \
        --query 'Table.BillingModeSummary.BillingMode' --output text 2>/dev/null || echo "UNKNOWN")
    
    if [[ "$PROD_BILLING" == "PAY_PER_REQUEST" ]]; then
        pass_test "Production using on-demand billing"
    else
        fail_test "Production not using optimal billing: $PROD_BILLING"
    fi
}
