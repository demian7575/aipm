#!/bin/bash
# Phase 1: Critical Infrastructure & Health Checks

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
KIRO_API_BASE="${KIRO_API_BASE:-http://44.220.45.57:8081}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
TARGET_ENV="${TARGET_ENV:-prod}"

echo "🔴 Phase 1: Critical Infrastructure & Health Checks"

# Basic Health & Connectivity
test_version_endpoint "$API_BASE"
test_database_connection "$API_BASE"
test_api_response_time "$API_BASE"
test_kiro_api_health "$KIRO_API_BASE"
test_health_check_endpoint "$API_BASE"
test_environment_health "$API_BASE" "$TARGET_ENV"

# Frontend & S3
test_frontend_availability "$FRONTEND_URL"
test_s3_config "$FRONTEND_URL"
test_network_connectivity "$API_BASE"

# Security
test_api_security_headers "$API_BASE"

echo "✅ Phase 1 completed"
