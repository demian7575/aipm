#!/bin/bash
# Phase 4: End-to-End Workflow Validation Tests

set -e
source "$(dirname "$0")/test-functions.sh"

echo "🔄 Phase 4: End-to-End Workflow Validation"

# Test 1: Story CRUD Workflow
log_test "Story CRUD Workflow"
STORY_ID=$(curl -s -X POST "$PROD_API_BASE/api/stories" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Story","asA":"tester","iWant":"to test","soThat":"it works","status":"Draft"}' \
    | jq -r '.id' 2>/dev/null || echo "")

if [[ -n "$STORY_ID" && "$STORY_ID" != "null" ]]; then
    # Verify story was created
    if curl -s "$PROD_API_BASE/api/stories/$STORY_ID" | jq -e '.id' > /dev/null 2>&1; then
        # Clean up
        curl -s -X DELETE "$PROD_API_BASE/api/stories/$STORY_ID" > /dev/null 2>&1
        pass_test "Story CRUD Workflow (Create → Read → Delete)"
    else
        fail_test "Story CRUD Workflow (Read failed)"
    fi
else
    fail_test "Story CRUD Workflow (Create failed)"
fi

# Test 2: INVEST Analysis SSE Workflow
log_test "INVEST Analysis SSE Workflow"
TEST_STORY_ID=$(curl -s "$PROD_API_BASE/api/stories" | jq -r '.[0].id' 2>/dev/null || echo "")
if [[ -n "$TEST_STORY_ID" && "$TEST_STORY_ID" != "null" ]]; then
    # Test SSE endpoint responds
    if timeout 5 curl -s "$PROD_API_BASE:8081/api/analyze-invest-stream?storyId=$TEST_STORY_ID" | grep -q "data:"; then
        pass_test "INVEST Analysis SSE Workflow"
    else
        fail_test "INVEST Analysis SSE Workflow (No SSE response)"
    fi
else
    fail_test "INVEST Analysis SSE Workflow (No test story found)"
fi

# Test 3: Health Check with AI Workflow
log_test "Health Check with AI Workflow"
if [[ -n "$TEST_STORY_ID" && "$TEST_STORY_ID" != "null" ]]; then
    HEALTH_RESPONSE=$(curl -s -X POST "$PROD_API_BASE/api/stories/$TEST_STORY_ID/health-check" \
        -H "Content-Type: application/json" \
        -d '{"includeAiInvest":false}' 2>/dev/null || echo "")
    
    if echo "$HEALTH_RESPONSE" | jq -e '.investAnalysis' > /dev/null 2>&1; then
        pass_test "Health Check Workflow (returns investAnalysis)"
    else
        fail_test "Health Check Workflow (no investAnalysis)"
    fi
else
    fail_test "Health Check Workflow (No test story)"
fi

# Test 4: MCP Server Integration
log_test "MCP Server Integration"
# Check if MCP server is accessible via Kiro API
if curl -s "$PROD_API_BASE:8081/health" | jq -e '.kiroHealthy' > /dev/null 2>&1; then
    pass_test "MCP Server Integration (Kiro healthy)"
else
    fail_test "MCP Server Integration (Kiro not healthy)"
fi

# Test 5: Frontend-Backend Integration
log_test "Frontend-Backend Integration"
if curl -s "$PROD_FRONTEND_URL" | grep -q "AIPM"; then
    # Check if frontend can reach backend
    if curl -s "$PROD_FRONTEND_URL/config.js" | grep -q "API_BASE_URL"; then
        pass_test "Frontend-Backend Integration (config loaded)"
    else
        fail_test "Frontend-Backend Integration (config missing)"
    fi
else
    fail_test "Frontend-Backend Integration (frontend not accessible)"
fi

# Test 6: Code Generation Endpoint
log_test "Code Generation Endpoint"
if curl -s -X POST "$PROD_API_BASE:8081/api/generate-code-branch" \
    -H "Content-Type: application/json" \
    -d '{"storyId":"test","prNumber":1,"originalBranch":"test","prompt":"test"}' \
    | jq -e '.success' > /dev/null 2>&1; then
    pass_test "Code Generation Endpoint (accepts requests)"
else
    # Expected to fail without valid PR, but should return proper error
    if curl -s -X POST "$PROD_API_BASE:8081/api/generate-code-branch" \
        -H "Content-Type: application/json" \
        -d '{"storyId":"test","prNumber":1,"originalBranch":"test","prompt":"test"}' \
        | jq -e '.error' > /dev/null 2>&1; then
        pass_test "Code Generation Endpoint (returns proper error)"
    else
        fail_test "Code Generation Endpoint (no response)"
    fi
fi

echo "✅ Phase 4 completed"
