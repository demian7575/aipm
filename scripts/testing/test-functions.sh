#!/bin/bash
# Shared test functions library - define once, use everywhere

# Configuration
PROD_API_BASE="http://44.220.45.57"
DEV_API_BASE="http://44.222.168.46"
PROD_FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
DEV_FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

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

# Basic endpoint test
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    if curl -s -m 10 "$url" | grep -q "$expected"; then
        pass_test "$name"
    else
        fail_test "$name"
    fi
}

# API JSON test
test_api_json() {
    local name=$1
    local url=$2
    
    if curl -s -m 10 "$url" | jq -e . > /dev/null 2>&1; then
        pass_test "$name"
    else
        fail_test "$name"
    fi
}

# Response time test
test_response_time() {
    local name=$1
    local url=$2
    local max_time=$3
    
    local response_time=$(curl -s -w "%{time_total}" -o /dev/null -m 10 "$url" 2>/dev/null || echo "10")
    local time_check=$(echo "$response_time < $max_time" | bc -l 2>/dev/null || echo "0")
    
    if [ "$time_check" = "1" ]; then
        pass_test "$name (${response_time}s)"
    else
        fail_test "$name (${response_time}s > ${max_time}s)"
    fi
}

# Draft generation test
test_draft_generation() {
    local name=$1
    local kiro_url=$2
    
    if curl -s -X POST "$kiro_url/api/generate-draft" \
        -H "Content-Type: application/json" \
        -d '{"templateId": "user-story-generation", "feature_description": "test", "parentId": "1"}' \
        | jq -e '.success' > /dev/null 2>&1; then
        pass_test "$name"
    else
        fail_test "$name"
    fi
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
    
    DIFF=$((DEV_COUNT - PROD_COUNT))
    ABS_DIFF=${DIFF#-}
    
    if [[ $ABS_DIFF -eq 0 ]]; then
        pass_test "Stories data consistent (Prod: $PROD_COUNT, Dev: $DEV_COUNT)"
    else
        fail_test "Stories data discrepancy (Prod: $PROD_COUNT, Dev: $DEV_COUNT) - DATABASE COPY NEEDED"
    fi
    
    # Acceptance tests consistency
    PROD_TESTS=$(aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_TESTS=$(aws dynamodb scan --table-name aipm-backend-dev-acceptance-tests --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    TEST_DIFF=$((PROD_TESTS - DEV_TESTS))
    TEST_ABS_DIFF=${TEST_DIFF#-}
    
    if [[ $TEST_ABS_DIFF -eq 0 ]]; then
        pass_test "Acceptance tests consistent (Prod: $PROD_TESTS, Dev: $DEV_TESTS)"
    else
        fail_test "Acceptance tests discrepancy (Prod: $PROD_TESTS, Dev: $DEV_TESTS) - DATABASE COPY NEEDED"
    fi
    
    # PRs consistency
    PROD_PRS=$(aws dynamodb scan --table-name aipm-backend-prod-prs --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    DEV_PRS=$(aws dynamodb scan --table-name aipm-backend-dev-prs --select COUNT \
        --query 'Count' --output text 2>/dev/null || echo "0")
    
    PRS_DIFF=$((PROD_PRS - DEV_PRS))
    PRS_ABS_DIFF=${PRS_DIFF#-}
    
    if [[ $PRS_ABS_DIFF -eq 0 ]]; then
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
    else
        # Check for uncommitted changes, but ignore config.js since it's generated during deployment
        UNCOMMITTED_CHANGES=$(git status --porcelain | grep -v "apps/frontend/public/config.js" || true)
        if [[ -n "$UNCOMMITTED_CHANGES" ]]; then
            fail_test "Repository has uncommitted changes (excluding config.js): $UNCOMMITTED_CHANGES"
        else
            pass_test "Repository is clean for deployment (config.js changes ignored)"
        fi
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
