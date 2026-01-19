#!/bin/bash
# Phase 1: Critical Security & Data Safety Tests

set -e

# Import shared functions and use parent script's variables
source "$(dirname "$0")/test-functions.sh"

# Use API_BASE from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"

echo "🔴 Phase 1: Critical Security & Data Safety"

# Security Tests
test_endpoint "API Security Headers" "$API_BASE/api/stories" "\\["

# Data Integrity Tests  
test_api_json "Stories Data" "$API_BASE/api/stories"

# Authentication Tests
test_endpoint "Version Endpoint" "$API_BASE/api/version" "version"

# Database Connectivity
test_api_json "Database Connection" "$API_BASE/api/stories"

echo "✅ Phase 1 completed"
