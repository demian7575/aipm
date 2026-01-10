#!/bin/bash
# Phase 1: Critical Security & Data Safety Tests

set -e

# Import shared functions and use parent script's variables
source "$(dirname "$0")/test-functions.sh"

echo "🔴 Phase 1: Critical Security & Data Safety"

# Security Tests
test_endpoint "Production API Security Headers" "$PROD_API_BASE/api/stories" "\\[" && pass_test "Production API Security Headers" || fail_test "Production API Security Headers"
test_endpoint "Development API Security Headers" "$DEV_API_BASE/api/stories" "\\[" && pass_test "Development API Security Headers" || fail_test "Development API Security Headers"

# Data Integrity Tests  
test_api_json "Production Stories Data" "$PROD_API_BASE/api/stories" && pass_test "Production Stories Data" || fail_test "Production Stories Data"
test_api_json "Development Stories Data" "$DEV_API_BASE/api/stories" && pass_test "Development Stories Data" || fail_test "Development Stories Data"

# Authentication Tests
test_endpoint "Production Version Endpoint" "$PROD_API_BASE/api/version" "version" && pass_test "Production Version Endpoint" || fail_test "Production Version Endpoint"
test_endpoint "Development Version Endpoint" "$DEV_API_BASE/api/version" "version" && pass_test "Development Version Endpoint" || fail_test "Development Version Endpoint"

# Database Connectivity
test_api_json "Production Database Connection" "$PROD_API_BASE/api/stories" && pass_test "Production Database Connection" || fail_test "Production Database Connection"
test_api_json "Development Database Connection" "$DEV_API_BASE/api/stories" && pass_test "Development Database Connection" || fail_test "Development Database Connection"

echo "✅ Phase 1 completed"
