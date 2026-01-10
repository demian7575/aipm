#!/bin/bash
# Phase 2: Performance & API Safety Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🟡 Phase 2: Performance & API Safety"

# API Performance Tests
test_response_time "Production API Response Time" "$PROD_API_BASE/api/version" 5 && pass_test "Production API Response Time" || fail_test "Production API Response Time"
test_response_time "Development API Response Time" "$DEV_API_BASE/api/version" 5 && pass_test "Development API Response Time" || fail_test "Development API Response Time"

# API Contract Tests
test_api_json "Production API Contract" "$PROD_API_BASE/api/version" && pass_test "Production API Contract" || fail_test "Production API Contract"
test_api_json "Development API Contract" "$DEV_API_BASE/api/version" && pass_test "Development API Contract" || fail_test "Development API Contract"

# Kiro API Tests
test_endpoint "Production Kiro API Health" "$PROD_API_BASE:8081/health" "running" && pass_test "Production Kiro API Health" || fail_test "Production Kiro API Health"
test_endpoint "Development Kiro API Health" "$DEV_API_BASE:8081/health" "running" && pass_test "Development Kiro API Health" || fail_test "Development Kiro API Health"

# Draft Generation Performance
test_draft_generation "Production Draft Generation" "$PROD_API_BASE:8081" && pass_test "Production Draft Generation" || fail_test "Production Draft Generation"
test_draft_generation "Development Draft Generation" "$DEV_API_BASE:8081" && pass_test "Development Draft Generation" || fail_test "Development Draft Generation"

echo "✅ Phase 2 completed"
