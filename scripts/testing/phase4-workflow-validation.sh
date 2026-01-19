#!/bin/bash
# Phase 4: Workflow Validation Tests

set -e
source "$(dirname "$0")/test-library.sh"

# Use variables from parent script
API_BASE="${API_BASE:-http://44.220.45.57:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com}"

echo "🔄 Phase 4: Workflow Validation Tests"

# Workflow tests
test_story_crud "$API_BASE"
test_story_hierarchy "$API_BASE"
test_frontend_backend_integration "$FRONTEND_URL"

echo "✅ Phase 4 completed"
