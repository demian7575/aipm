#!/bin/bash
# Phase 2: Performance & API Safety Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🟡 Phase 2: Performance & API Safety"

# API Performance Tests
test_response_time "Production API Response Time" "$PROD_API_BASE/api/version" 5
test_response_time "Development API Response Time" "$DEV_API_BASE/api/version" 5

# API Contract Tests
test_api_json "Production API Contract" "$PROD_API_BASE/api/version"
test_api_json "Development API Contract" "$DEV_API_BASE/api/version"

# Kiro API Tests
test_endpoint "Production Kiro API Health" "$PROD_API_BASE:8081/health" "running"
test_endpoint "Development Kiro API Health" "$DEV_API_BASE:8081/health" "running"

# Draft Generation Performance
test_draft_generation "Production Draft Generation" "$PROD_API_BASE:8081"
test_draft_generation "Development Draft Generation" "$DEV_API_BASE:8081"

echo "✅ Phase 2 completed"
