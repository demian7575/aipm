#!/bin/bash
# AIPM Workflow Gating Tests Implementation
# Based on comprehensive architecture analysis

set -e

# Configuration
PROD_API_BASE="http://44.220.45.57"
DEV_API_BASE="http://44.222.168.46"
KIRO_API_BASE="http://44.220.45.57:8081"
PROD_FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
DEV_FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

STORIES_TABLE="aipm-backend-prod-stories"
ACCEPTANCE_TESTS_TABLE="aipm-backend-prod-acceptance-tests"
DEV_STORIES_TABLE="aipm-backend-dev-stories"
DEV_ACCEPTANCE_TESTS_TABLE="aipm-backend-dev-acceptance-tests"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
CURRENT_WORKFLOW=""

# Utility functions
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

test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    log_test "$description"
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/test_response "$url" 2>/dev/null || echo "000")
    
    if [[ "$response" == "$expected_status" ]]; then
        pass_test "$description (Status: $response)"
        return 0
    else
        fail_test "$description (Expected: $expected_status, Got: $response)"
        return 1
    fi
}

# 1. User Story Creation Workflow Tests
test_story_creation_workflow() {
    echo "📝 Testing User Story Creation Workflow"
    CURRENT_WORKFLOW="Story Creation"
    
    # Pre-deployment tests
    log_test "DynamoDB table existence"
    if aws dynamodb describe-table --table-name "$STORIES_TABLE" >/dev/null 2>&1; then
        pass_test "Stories table exists"
    else
        fail_test "Stories table missing"
    fi
    
    if aws dynamodb describe-table --table-name "$ACCEPTANCE_TESTS_TABLE" >/dev/null 2>&1; then
        pass_test "Acceptance tests table exists"
    else
        fail_test "Acceptance tests table missing"
    fi
    
    # API endpoint tests
    test_endpoint "$PROD_API_BASE/api/stories" "Stories API endpoint"
    test_endpoint "$DEV_API_BASE/api/stories" "Development stories API endpoint"
    
    # Frontend configuration tests
    log_test "Frontend configuration validation"
    if curl -s "$PROD_FRONTEND_URL/config.js" | grep -q "API_BASE_URL"; then
        pass_test "Production frontend config valid"
    else
        fail_test "Production frontend config invalid"
    fi
    
    if curl -s "$DEV_FRONTEND_URL/config.js" | grep -q "API_BASE_URL"; then
        pass_test "Development frontend config valid"
    else
        fail_test "Development frontend config invalid"
    fi
    
    # Story CRUD operations test
    log_test "Story CRUD operations"
    local test_story_data='{"title":"Gating Test Story","description":"Test story for gating tests","status":"Draft"}'
    
    # Create story
    local create_response=$(curl -s -X POST "$PROD_API_BASE/api/stories" \
        -H "Content-Type: application/json" \
        -d "$test_story_data")
    
    local story_id=$(echo "$create_response" | jq -r '.id // empty')
    
    if [[ -n "$story_id" && "$story_id" != "null" ]]; then
        pass_test "Story creation successful (ID: $story_id)"
        
        # Read story
        if curl -s "$PROD_API_BASE/api/stories/$story_id" | grep -q "Gating Test Story"; then
            pass_test "Story read successful"
        else
            fail_test "Story read failed"
        fi
        
        # Update story
        local update_data='{"title":"Updated Gating Test Story","description":"Updated description"}'
        if curl -s -X PUT "$PROD_API_BASE/api/stories/$story_id" \
            -H "Content-Type: application/json" \
            -d "$update_data" | grep -q "success\|Updated"; then
            pass_test "Story update successful"
        else
            fail_test "Story update failed"
        fi
        
        # Delete story (cleanup)
        if curl -s -X DELETE "$PROD_API_BASE/api/stories/$story_id" | grep -q "success\|deleted"; then
            pass_test "Story deletion successful"
        else
            fail_test "Story deletion failed"
        fi
    else
        fail_test "Story creation failed"
    fi
}

# 2. Code Generation Workflow Tests
test_code_generation_workflow() {
    echo "🤖 Testing Code Generation Workflow"
    CURRENT_WORKFLOW="Code Generation"
    
    # Kiro API health check
    test_endpoint "$KIRO_API_BASE/health" "Kiro API health check"
    
    # Template system tests
    log_test "Template files existence"
    if [[ -f "./templates/code-generation.md" ]]; then
        pass_test "Code generation template exists"
    else
        fail_test "Code generation template missing"
    fi
    
    if [[ -f "./templates/user-story-generation.md" ]]; then
        pass_test "User story generation template exists"
    else
        fail_test "User story generation template missing"
    fi
    
    # Template API endpoint
    test_endpoint "$KIRO_API_BASE/api/templates" "Templates API endpoint"
    
    # GitHub integration test
    log_test "GitHub API access"
    if [[ -n "$GITHUB_TOKEN" ]]; then
        if curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/repos/demian7575/aipm" | grep -q "demian7575"; then
            pass_test "GitHub API access successful"
        else
            fail_test "GitHub API access failed"
        fi
    else
        fail_test "GITHUB_TOKEN not configured"
    fi
    
    # Kiro CLI availability (if running on EC2)
    log_test "Kiro CLI process status"
    if curl -s "$KIRO_API_BASE/health" | grep -q '"kiroProcess":"running"'; then
        pass_test "Kiro CLI process running"
    else
        fail_test "Kiro CLI process not running"
    fi
}

# 3. PR Deployment Workflow Tests
test_pr_deployment_workflow() {
    echo "🚀 Testing PR Deployment Workflow"
    CURRENT_WORKFLOW="PR Deployment"
    
    # GitHub Actions workflow files
    log_test "GitHub Actions workflow files"
    if [[ -f ".github/workflows/deploy-pr-to-dev.yml" ]]; then
        pass_test "PR deployment workflow exists"
    else
        fail_test "PR deployment workflow missing"
    fi
    
    # AWS credentials test
    log_test "AWS credentials validation"
    if aws sts get-caller-identity >/dev/null 2>&1; then
        pass_test "AWS credentials valid"
    else
        fail_test "AWS credentials invalid"
    fi
    
    # S3 bucket access
    log_test "S3 deployment bucket access"
    if aws s3 ls s3://aipm-deployments-728378229251/ >/dev/null 2>&1; then
        pass_test "S3 deployment bucket accessible"
    else
        fail_test "S3 deployment bucket not accessible"
    fi
    
    # Backend deployment API
    log_test "Backend deployment API"
    local deploy_response=$(curl -s -X POST "$DEV_API_BASE/api/deploy-backend" \
        -H "Content-Type: application/json" \
        -d '{"test":"validation"}')
    
    if echo "$deploy_response" | grep -q "error.*Missing"; then
        pass_test "Deploy API validation working"
    else
        fail_test "Deploy API validation not working"
    fi
    
    # Required files for deployment
    log_test "Deployment file prerequisites"
    local missing_files=()
    
    [[ -f "apps/backend/app.js" ]] || missing_files+=("apps/backend/app.js")
    [[ -f "apps/backend/server.js" ]] || missing_files+=("apps/backend/server.js")
    [[ -f "apps/frontend/public/index.html" ]] || missing_files+=("apps/frontend/public/index.html")
    [[ -f "apps/frontend/public/app.js" ]] || missing_files+=("apps/frontend/public/app.js")
    
    if [[ ${#missing_files[@]} -eq 0 ]]; then
        pass_test "All deployment files present"
    else
        fail_test "Missing deployment files: ${missing_files[*]}"
    fi
}

# 4. Data Synchronization Workflow Tests
test_data_sync_workflow() {
    echo "🔄 Testing Data Synchronization Workflow"
    CURRENT_WORKFLOW="Data Synchronization"
    
    # DynamoDB table access
    log_test "Production DynamoDB tables"
    if aws dynamodb describe-table --table-name "$STORIES_TABLE" >/dev/null 2>&1; then
        pass_test "Production stories table accessible"
    else
        fail_test "Production stories table not accessible"
    fi
    
    log_test "Development DynamoDB tables"
    if aws dynamodb describe-table --table-name "$DEV_STORIES_TABLE" >/dev/null 2>&1; then
        pass_test "Development stories table accessible"
    else
        fail_test "Development stories table not accessible"
    fi
    
    # Data sync API endpoint
    test_endpoint "$DEV_API_BASE/api/sync-data" "Data sync API endpoint" "405"  # POST required
    
    # Test actual data sync (non-destructive)
    log_test "Data synchronization process"
    local sync_response=$(curl -s -X POST "$DEV_API_BASE/api/sync-data")
    
    if echo "$sync_response" | grep -q '"success":true'; then
        local exported=$(echo "$sync_response" | jq -r '.exportedItems // 0')
        local imported=$(echo "$sync_response" | jq -r '.importedItems // 0')
        pass_test "Data sync successful (Exported: $exported, Imported: $imported)"
    else
        fail_test "Data sync failed: $sync_response"
    fi
}

# 5. GitHub Actions CI/CD Workflow Tests
test_cicd_workflow() {
    echo "⚙️ Testing CI/CD Workflow"
    CURRENT_WORKFLOW="CI/CD"
    
    # Workflow syntax validation
    log_test "GitHub Actions workflow syntax"
    if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-pr-to-dev.yml'))" 2>/dev/null; then
        pass_test "PR deployment workflow YAML valid"
    else
        fail_test "PR deployment workflow YAML invalid"
    fi
    
    # Required workflow components
    log_test "Workflow trigger configuration"
    if grep -q "pull_request:" .github/workflows/deploy-pr-to-dev.yml; then
        pass_test "PR trigger configured"
    else
        fail_test "PR trigger missing"
    fi
    
    if grep -q "workflow_dispatch:" .github/workflows/deploy-pr-to-dev.yml; then
        pass_test "Manual trigger configured"
    else
        fail_test "Manual trigger missing"
    fi
    
    # SSH connectivity to EC2 instances
    log_test "EC2 SSH connectivity"
    if timeout 10 ssh -o ConnectTimeout=5 -o BatchMode=yes ec2-user@44.222.168.46 'echo "SSH OK"' >/dev/null 2>&1; then
        pass_test "Development EC2 SSH accessible"
    else
        fail_test "Development EC2 SSH not accessible"
    fi
}

# Main execution function
run_all_workflow_gating_tests() {
    echo "🧪 AIPM Workflow Gating Tests"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Run all workflow tests
    test_story_creation_workflow || true
    echo ""
    
    test_code_generation_workflow || true
    echo ""
    
    test_pr_deployment_workflow || true
    echo ""
    
    test_data_sync_workflow || true
    echo ""
    
    test_cicd_workflow || true
    echo ""
    
    # Summary
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Test Results Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Tests Passed: $TESTS_PASSED"
    echo "❌ Tests Failed: $TESTS_FAILED"
    echo "📈 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo ""
        echo "🎉 All workflow gating tests passed!"
        echo "✅ System is ready for deployment"
        exit 0
    else
        echo ""
        echo "⚠️  Some tests failed - deployment should be blocked"
        echo "❌ Fix failing tests before proceeding"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_all_workflow_gating_tests "$@"
fi
