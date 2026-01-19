#!/bin/bash
# Phase 2: Performance & API Safety Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

echo "🟡 Phase 2: Performance & API Safety"

# All tests are now independent and reusable
test_api_response_time "$API_BASE" 5
test_kiro_api_health "$KIRO_API_BASE"
test_draft_generation_performance "$KIRO_API_BASE"

echo "✅ Phase 2 completed"
