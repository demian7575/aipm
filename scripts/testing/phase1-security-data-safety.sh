#!/bin/bash
# Phase 1: Critical Infrastructure & Health Checks

# Don't use set -e - let tests report their own failures
set +e

# Debug: Show current directory and file existence
echo "📍 Current directory: $(pwd)"
echo "📍 Script location: $(dirname "$0")"
echo "📍 Checking test-library.sh..."
if [ -f "$(dirname "$0")/test-library.sh" ]; then
  echo "✅ test-library.sh found"
else
  echo "❌ test-library.sh NOT found"
  ls -la "$(dirname "$0")" | head -20
  exit 1
fi

source "$(dirname "$0")/test-library.sh"
if [ $? -ne 0 ]; then
  echo "❌ Failed to source test-library.sh"
  exit 1
fi

# Use variables from parent script
API_BASE="${API_BASE:-http://3.92.96.67:4000}"
SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://localhost:8083}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"
TARGET_ENV="${TARGET_ENV:-prod}"

echo "🔴 Phase 1: Critical Infrastructure & Health Checks"

# Run tests in parallel and capture exit codes
pids=()
(test_version_endpoint "$API_BASE") & pids+=($!)
(test_database_connection "$API_BASE") & pids+=($!)
(test_api_response_time "$API_BASE") & pids+=($!)
(test_semantic_api_health "$SEMANTIC_API_BASE") & pids+=($!)
(test_health_check_endpoint "$API_BASE") & pids+=($!)
(test_environment_health "$API_BASE" "$TARGET_ENV") & pids+=($!)
(test_frontend_availability "$FRONTEND_URL") & pids+=($!)
(test_frontend_backend_integration "$FRONTEND_URL") & pids+=($!)
(test_s3_config "$FRONTEND_URL") & pids+=($!)
(test_network_connectivity "$API_BASE") & pids+=($!)
(test_api_security_headers "$API_BASE") & pids+=($!)
(test_code_generation_endpoint "$SEMANTIC_API_BASE") & pids+=($!)

# Wait for all parallel tests to complete
failed=0
for pid in "${pids[@]}"; do
  wait $pid || ((failed++))
done

# Check if any tests failed
if [ $failed -gt 0 ]; then
  echo "❌ Phase 1 failed: $failed tests failed"
  exit 1
fi

echo "✅ Phase 1 completed: all tests passed"
exit 0
