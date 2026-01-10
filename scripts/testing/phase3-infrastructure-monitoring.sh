#!/bin/bash
# Phase 3: Infrastructure & Monitoring Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🟢 Phase 3: Infrastructure & Monitoring"

# Frontend Infrastructure
test_endpoint "Production Frontend Availability" "$PROD_FRONTEND_URL" "html" && pass_test "Production Frontend Availability" || fail_test "Production Frontend Availability"
test_endpoint "Development Frontend Availability" "$DEV_FRONTEND_URL" "html" && pass_test "Development Frontend Availability" || fail_test "Development Frontend Availability"

# S3 Configuration
test_endpoint "Production S3 Config" "$PROD_FRONTEND_URL/config-prod.js" "API_BASE_URL" && pass_test "Production S3 Config" || fail_test "Production S3 Config"
test_endpoint "Development S3 Config" "$DEV_FRONTEND_URL/config-dev.js" "API_BASE_URL" && pass_test "Development S3 Config" || fail_test "Development S3 Config"

# Network Connectivity
test_endpoint "Production Network" "$PROD_API_BASE/api/version" "version" && pass_test "Production Network" || fail_test "Production Network"
test_endpoint "Development Network" "$DEV_API_BASE/api/version" "version" && pass_test "Development Network" || fail_test "Development Network"

# Service Health
test_endpoint "Production Service Health" "$PROD_API_BASE/api/stories" "\\[" && pass_test "Production Service Health" || fail_test "Production Service Health"
test_endpoint "Development Service Health" "$DEV_API_BASE/api/stories" "\\[" && pass_test "Development Service Health" || fail_test "Development Service Health"

echo "✅ Phase 3 completed"
