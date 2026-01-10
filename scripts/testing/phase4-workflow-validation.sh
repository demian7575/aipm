#!/bin/bash
# Phase 4: End-to-End Workflow Validation Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🔄 Phase 4: End-to-End Workflow Validation"

# Story Management Workflow
test_api_json "Production Story Creation Workflow" "$PROD_API_BASE/api/stories"
test_api_json "Development Story Creation Workflow" "$DEV_API_BASE/api/stories"

# Draft Generation Workflow
test_draft_generation "Production Draft Workflow" "$PROD_API_BASE:8081"
test_draft_generation "Development Draft Workflow" "$DEV_API_BASE:8081"

# Frontend-Backend Integration
test_endpoint "Production Frontend-Backend Integration" "$PROD_FRONTEND_URL" "html"
test_endpoint "Development Frontend-Backend Integration" "$DEV_FRONTEND_URL" "html"

# Data Sync Workflow
test_api_json "Production Data Consistency" "$PROD_API_BASE/api/stories"
test_api_json "Development Data Consistency" "$DEV_API_BASE/api/stories"

echo "✅ Phase 4 completed"
