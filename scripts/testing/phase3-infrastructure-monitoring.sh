#!/bin/bash
# Phase 3: Infrastructure & Monitoring Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🟢 Phase 3: Infrastructure & Monitoring"

# Frontend Infrastructure
test_endpoint "Production Frontend Availability" "$PROD_FRONTEND_URL" "html"
test_endpoint "Development Frontend Availability" "$DEV_FRONTEND_URL" "html"

# S3 Configuration
test_endpoint "Production S3 Config" "$PROD_FRONTEND_URL/config-prod.js" "API_BASE_URL"
test_endpoint "Development S3 Config" "$DEV_FRONTEND_URL/config-dev.js" "API_BASE_URL"

# Network Connectivity
test_endpoint "Production Network" "$PROD_API_BASE/api/version" "version"
test_endpoint "Development Network" "$DEV_API_BASE/api/version" "version"

# Service Health
test_endpoint "Production Service Health" "$PROD_API_BASE/api/stories" "\\["
test_endpoint "Development Service Health" "$DEV_API_BASE/api/stories" "\\["

echo "✅ Phase 3 completed"
