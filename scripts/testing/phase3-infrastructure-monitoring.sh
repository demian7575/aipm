#!/bin/bash
# Phase 3: Infrastructure & Monitoring Tests

set -e
source "$(dirname "$0")/test-functions.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
TARGET_ENV="${TARGET_ENV:-prod}"

echo "🟢 Phase 3: Infrastructure & Monitoring"

# Frontend Infrastructure
test_endpoint "Frontend Availability" "$FRONTEND_URL" "html"

# S3 Configuration
CONFIG_FILE="config-${TARGET_ENV}.js"
test_endpoint "S3 Config" "$FRONTEND_URL/$CONFIG_FILE" "API_BASE_URL"

# Network Connectivity
test_endpoint "Network" "$API_BASE/api/version" "version"

# Service Health
test_endpoint "Service Health" "$API_BASE/api/stories" "\\["

echo "✅ Phase 3 completed"
