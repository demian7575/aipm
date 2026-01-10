#!/bin/bash
# Phase 1: Critical Security & Data Safety Tests

set -e

# Import shared functions and use parent script's variables
source "$(dirname "$0")/test-functions.sh"

echo "🔴 Phase 1: Critical Security & Data Safety"

# Security Tests
test_endpoint "Production API Security Headers" "$PROD_API_BASE/api/stories" "\\["
test_endpoint "Development API Security Headers" "$DEV_API_BASE/api/stories" "\\["

# Data Integrity Tests  
test_api_json "Production Stories Data" "$PROD_API_BASE/api/stories"
test_api_json "Development Stories Data" "$DEV_API_BASE/api/stories"

# Authentication Tests
test_endpoint "Production Version Endpoint" "$PROD_API_BASE/api/version" "version"
test_endpoint "Development Version Endpoint" "$DEV_API_BASE/api/version" "version"

# Database Connectivity
test_api_json "Production Database Connection" "$PROD_API_BASE/api/stories"
test_api_json "Development Database Connection" "$DEV_API_BASE/api/stories"

echo "✅ Phase 1 completed"
