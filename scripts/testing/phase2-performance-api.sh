#!/bin/bash
# Phase 2: API Functionality & Workflow Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"

echo "🟡 Phase 2: API Functionality & Workflow Tests"

# Performance tests
test_draft_generation_performance "$KIRO_API_BASE"

# API functionality tests
test_invest_analysis_sse "$KIRO_API_BASE"
test_code_generation_endpoint "$KIRO_API_BASE"

# Workflow tests
test_story_crud "$API_BASE"
test_story_hierarchy "$API_BASE"
test_frontend_backend_integration "$FRONTEND_URL"

echo "✅ Phase 2 completed"
