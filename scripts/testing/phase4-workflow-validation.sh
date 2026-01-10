#!/bin/bash
# Phase 4: End-to-End Workflow Validation Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🔄 Phase 4: End-to-End Workflow Validation"

# Story Management Workflow
test_api_json "Production Story Creation Workflow" "$PROD_API_BASE/api/stories" && pass_test "Production Story Creation Workflow" || fail_test "Production Story Creation Workflow"
test_api_json "Development Story Creation Workflow" "$DEV_API_BASE/api/stories" && pass_test "Development Story Creation Workflow" || fail_test "Development Story Creation Workflow"

# Draft Generation Workflow
test_draft_generation "Production Draft Workflow" "$PROD_API_BASE:8081" && pass_test "Production Draft Workflow" || fail_test "Production Draft Workflow"
test_draft_generation "Development Draft Workflow" "$DEV_API_BASE:8081" && pass_test "Development Draft Workflow" || fail_test "Development Draft Workflow"

# Frontend-Backend Integration
test_endpoint "Production Frontend-Backend Integration" "$PROD_FRONTEND_URL" "html" && pass_test "Production Frontend-Backend Integration" || fail_test "Production Frontend-Backend Integration"
test_endpoint "Development Frontend-Backend Integration" "$DEV_FRONTEND_URL" "html" && pass_test "Development Frontend-Backend Integration" || fail_test "Development Frontend-Backend Integration"

# Data Sync Workflow
test_api_json "Production Data Consistency" "$PROD_API_BASE/api/stories" && pass_test "Production Data Consistency" || fail_test "Production Data Consistency"
test_api_json "Development Data Consistency" "$DEV_API_BASE/api/stories" && pass_test "Development Data Consistency" || fail_test "Development Data Consistency"

echo "✅ Phase 4 completed"
