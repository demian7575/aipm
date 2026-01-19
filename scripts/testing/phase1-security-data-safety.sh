#!/bin/bash
# Phase 1: Critical Security & Data Safety Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"

echo "🔴 Phase 1: Critical Security & Data Safety"

# All tests are now independent and reusable
test_api_security_headers "$API_BASE"
test_database_connection "$API_BASE"
test_version_endpoint "$API_BASE"

echo "✅ Phase 1 completed"
