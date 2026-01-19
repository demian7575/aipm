#!/bin/bash
# Phase 3: API Functionality Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

echo "🟢 Phase 3: API Functionality Tests"

# API functionality tests (not duplicated in other phases)
test_invest_analysis_sse "$API_BASE" "$KIRO_API_BASE"
test_code_generation_endpoint "$KIRO_API_BASE"

echo "✅ Phase 3 completed"
