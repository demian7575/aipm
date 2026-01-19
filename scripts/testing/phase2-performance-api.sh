#!/bin/bash
# Phase 2: Performance & Load Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"

echo "🟡 Phase 2: Performance & Load Tests"

# Performance tests
test_draft_generation_performance "$KIRO_API_BASE"

echo "✅ Phase 2 completed"
