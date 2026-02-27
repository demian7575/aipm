#!/bin/bash
# Phase 1: Critical Infrastructure & Health Checks
# Always uses Development DynamoDB for data isolation

# Don't use set -e - let tests report their own failures
set +e

# Get script directory (works with both direct execution and source)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Debug: Show current directory and file existence
echo "📍 Current directory: $(pwd)"
echo "📍 Script location: $SCRIPT_DIR"
echo "📍 Checking test-library.sh..."
if [ -f "$SCRIPT_DIR/test-library.sh" ]; then
  echo "✅ test-library.sh found"
else
  echo "❌ test-library.sh NOT found"
  ls -la "$SCRIPT_DIR" | head -20
  exit 1
fi

source "$SCRIPT_DIR/test-library.sh"
if [ $? -ne 0 ]; then
  echo "❌ Failed to source test-library.sh"
  exit 1
fi

# Load environment config
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$PROJECT_ROOT/scripts/utilities/load-env-config.sh" "${TARGET_ENV:-prod}"

# Use variables from parent script or loaded config
API_BASE="${API_BASE:-$API_BASE}"
TARGET_ENV="${TARGET_ENV:-prod}"

# Auto-detect Semantic API URL based on API_BASE
if [[ "$API_BASE" =~ ^http://([^:]+):([0-9]+) ]]; then
  HOST="${BASH_REMATCH[1]}"
  SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://$HOST:8083}"
else
  SEMANTIC_API_BASE="${SEMANTIC_API_BASE:-http://localhost:8083}"
fi

# Generate unique run ID for this test execution
export TEST_RUN_ID="${TEST_RUN_ID:-$(date +%s)-$$}"
export TEST_PHASE="phase1"

echo "🔴 Phase 1: Critical Infrastructure & Health Checks"
echo "Backend: $API_BASE"
echo "Database: Development DynamoDB (data isolation)"
echo ""

# Run tests in parallel and capture exit codes
pids=()
(test_version_endpoint "$API_BASE" "health-001-version-endpoint") & pids+=($!)
(test_database_connection "$API_BASE" "health-002-database-connection") & pids+=($!)
(test_api_response_time "$API_BASE" "health-003-api-response-time") & pids+=($!)
(test_semantic_api_health "$SEMANTIC_API_BASE" "health-004-semantic-api") & pids+=($!)
(test_session_pool_health "$SEMANTIC_API_BASE" "health-005-session-pool") & pids+=($!)
(test_environment_health "$API_BASE" "$TARGET_ENV" "health-006-environment") & pids+=($!)
(test_frontend_availability "$FRONTEND_URL" "health-007-frontend-availability") & pids+=($!)
(test_frontend_backend_integration "$FRONTEND_URL" "health-008-frontend-backend-integration") & pids+=($!)
(test_s3_config "$FRONTEND_URL" "health-009-s3-config") & pids+=($!)
(test_network_connectivity "$API_BASE" "health-010-network-connectivity") & pids+=($!)
(test_api_security_headers "$API_BASE" "health-011-security-headers") & pids+=($!)
(test_mindmap_story_loading "$API_BASE" "health-012-mindmap-loading") & pids+=($!)

# Wait for all parallel tests to complete
for pid in "${pids[@]}"; do
  wait $pid
done

# Check test results from counter
failed=$(cat "$TEST_COUNTER_DIR/failed" 2>/dev/null || echo "0")

# Check if any tests failed
if [ "$failed" -gt 0 ]; then
  echo "❌ Phase 1 failed: $failed tests failed"
  return 1
fi

echo "✅ Phase 1 completed: all tests passed"
return 0
