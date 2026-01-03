#!/bin/bash
# Phase 3: Infrastructure & Monitoring Tests
# Priority: 🟢 Medium - Informational, doesn't block deployment

set -e

TESTS_PASSED=0
TESTS_FAILED=0
PROD_FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
DEV_FRONTEND_URL="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"

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

# 3.1 Network & Infrastructure Tests
test_network_infrastructure() {
    echo "🌐 Network & Infrastructure Tests"
    
    # DNS resolution
    log_test "DNS resolution validation"
    if curl -I -s --max-time 5 "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com" >/dev/null 2>&1; then
        pass_test "Production frontend accessible"
    else
        fail_test "Production frontend not accessible"
    fi
    
    if curl -I -s --max-time 5 "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com" >/dev/null 2>&1; then
        pass_test "Development frontend accessible"
    else
        fail_test "Development frontend not accessible"
    fi
    
    # SSL/TLS validation (for HTTPS endpoints)
    log_test "GitHub API SSL validation"
    if curl -s --connect-timeout 5 https://api.github.com >/dev/null 2>&1; then
        pass_test "GitHub API SSL connection successful"
    else
        fail_test "GitHub API SSL connection failed"
    fi
    
    # Network connectivity
    log_test "EC2 instance connectivity"
    if curl -I -s --max-time 5 "http://44.220.45.57" >/dev/null 2>&1; then
        pass_test "Production EC2 instance reachable"
    else
        fail_test "Production EC2 instance unreachable"
    fi
    
    if curl -I -s --max-time 5 "http://44.222.168.46" >/dev/null 2>&1; then
        pass_test "Development EC2 instance reachable"
    else
        fail_test "Development EC2 instance unreachable"
    fi
    
    # S3 bucket accessibility
    log_test "S3 bucket accessibility"
    if curl -s -I "$PROD_FRONTEND_URL" | grep -q "200 OK"; then
        pass_test "Production S3 bucket accessible"
    else
        fail_test "Production S3 bucket not accessible"
    fi
    
    if curl -s -I "$DEV_FRONTEND_URL" | grep -q "200 OK"; then
        pass_test "Development S3 bucket accessible"
    else
        fail_test "Development S3 bucket not accessible"
    fi
}

# 3.2 Monitoring & Alerting Tests
test_monitoring_alerting() {
    echo ""
    echo "📊 Monitoring & Alerting Tests"
    
    # Health endpoint monitoring
    log_test "Health endpoint availability"
    HEALTH_ENDPOINTS=("http://44.220.45.57:4000/health" "http://44.222.168.46:4000/health" "http://44.220.45.57:8081/health")
    
    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        if curl -s -m 5 "$endpoint" | grep -q "running\|healthy\|ok"; then
            pass_test "Health endpoint accessible: $endpoint"
        else
            fail_test "Health endpoint failed: $endpoint"
        fi
    done
    
    # Log file accessibility (if running on EC2)
    if [[ -f "/tmp/kiro-cli-live.log" ]]; then
        log_test "Log file accessibility"
        if [[ -r "/tmp/kiro-cli-live.log" ]]; then
            pass_test "Kiro CLI log file accessible"
        else
            fail_test "Kiro CLI log file not readable"
        fi
    else
        pass_test "Log file check skipped (not on EC2)"
    fi
    
    # AWS CloudWatch integration (basic check)
    log_test "AWS CloudWatch integration"
    if aws logs describe-log-groups --limit 1 >/dev/null 2>&1; then
        pass_test "CloudWatch Logs accessible"
    else
        fail_test "CloudWatch Logs not accessible"
    fi
}

# 3.3 Integration Tests
test_integration() {
    echo ""
    echo "🔗 Integration Tests"
    
    # GitHub API integration
    log_test "GitHub API integration"
    if [[ -n "$GITHUB_TOKEN" ]]; then
        RATE_LIMIT=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
            "https://api.github.com/rate_limit" | jq -r '.rate.remaining // 0')
        
        if [[ "$RATE_LIMIT" -gt 100 ]]; then
            pass_test "GitHub API rate limit healthy: $RATE_LIMIT remaining"
        else
            fail_test "GitHub API rate limit low: $RATE_LIMIT remaining"
        fi
    else
        fail_test "GitHub token not available for integration test"
    fi
    
    # Frontend-Backend integration
    log_test "Frontend-Backend integration"
    FRONTEND_CONFIG=$(curl -s "$PROD_FRONTEND_URL/config.js" 2>/dev/null || echo "")
    
    if echo "$FRONTEND_CONFIG" | grep -q "API_BASE_URL"; then
        API_URL=$(echo "$FRONTEND_CONFIG" | grep -o "http://[^']*" | head -1)
        if curl -s -m 5 "$API_URL/health" | grep -q "running"; then
            pass_test "Frontend config points to healthy backend"
        else
            fail_test "Frontend config points to unhealthy backend"
        fi
    else
        fail_test "Frontend config not accessible or invalid"
    fi
    
    # Cross-environment consistency
    log_test "Cross-environment consistency"
    PROD_CONFIG=$(curl -s "$PROD_FRONTEND_URL/config.js" 2>/dev/null | grep -o "ENVIRONMENT.*production" || echo "")
    DEV_CONFIG=$(curl -s "$DEV_FRONTEND_URL/config.js" 2>/dev/null | grep -o "ENVIRONMENT.*development" || echo "")
    
    if [[ -n "$PROD_CONFIG" && -n "$DEV_CONFIG" ]]; then
        pass_test "Environment configurations are distinct"
    else
        fail_test "Environment configurations may be incorrect"
    fi
    
    # Template system integration
    log_test "Template system integration"
    if [[ -f "./templates/code-generation.md" && -f "./templates/user-story-generation.md" ]]; then
        pass_test "Template files present for code generation"
    else
        fail_test "Template files missing"
    fi
    
    # Workflow file validation
    log_test "GitHub Actions workflow validation"
    WORKFLOW_FILES=(".github/workflows/deploy-pr-to-dev.yml" ".github/workflows/workflow-gating-tests.yml")
    MISSING_WORKFLOWS=()
    
    for workflow in "${WORKFLOW_FILES[@]}"; do
        if [[ ! -f "$workflow" ]]; then
            MISSING_WORKFLOWS+=("$workflow")
        fi
    done
    
    if [[ ${#MISSING_WORKFLOWS[@]} -eq 0 ]]; then
        pass_test "GitHub Actions workflows present"
    else
        fail_test "Missing workflows: ${MISSING_WORKFLOWS[*]}"
    fi
}

# Main execution
main() {
    echo "🟢 Phase 3: Infrastructure & Monitoring"
    echo ""
    
    test_network_infrastructure || true
    test_monitoring_alerting || true
    test_integration || true
    
    echo ""
    echo "📊 Phase 3 Results: ✅ $TESTS_PASSED passed, ❌ $TESTS_FAILED failed"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo "🎉 Phase 3 completed successfully"
        exit 0
    else
        echo "ℹ️  Phase 3 has failures - informational only, doesn't block deployment"
        exit 1
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
