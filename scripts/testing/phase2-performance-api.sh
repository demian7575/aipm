#!/bin/bash
# Phase 2: Performance & API Safety Tests

set -e
source "$(dirname "$0")/test-functions.sh"

# Use API_BASE and KIRO_API_BASE from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

echo "🟡 Phase 2: Performance & API Safety"

# API Performance Tests
test_response_time "API Response Time" "$API_BASE/api/version" 5

# API Contract Tests
test_api_json "API Contract" "$API_BASE/api/version"

# Kiro API Tests
test_endpoint "Kiro API Health" "$KIRO_API_BASE/health" "running"

# Draft Generation Performance
test_draft_generation "Draft Generation" "$KIRO_API_BASE"

echo "✅ Phase 2 completed"
