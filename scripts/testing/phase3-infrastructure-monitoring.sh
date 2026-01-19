#!/bin/bash
# Phase 3: Infrastructure & Monitoring Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
TARGET_ENV="${TARGET_ENV:-prod}"

echo "🟢 Phase 3: Infrastructure & Monitoring"

# All tests are now independent and reusable
test_frontend_availability "$FRONTEND_URL"
test_s3_config "$FRONTEND_URL" "$TARGET_ENV"
test_network_connectivity "$API_BASE"

echo "✅ Phase 3 completed"
