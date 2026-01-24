# AIPM Gating Tests Plan
**Generated:** 2026-01-03 22:15 JST  
**Based on:** Systematic architecture analysis

## Overview

This document defines comprehensive gating tests for each AIPM workflow to prevent errors and ensure system reliability. Tests are organized by workflow and include pre-deployment, runtime, and post-deployment validations.

## Test Categories

### 1. Pre-Deployment Gating Tests
- **Purpose:** Prevent deployment of broken code
- **Trigger:** Before any deployment (PR, staging, production)
- **Failure Action:** Block deployment

### 2. Runtime Gating Tests  
- **Purpose:** Validate system health during operation
- **Trigger:** Continuous monitoring, health checks
- **Failure Action:** Alert, auto-recovery

### 3. Post-Deployment Gating Tests
- **Purpose:** Verify deployment success
- **Trigger:** After deployment completion
- **Failure Action:** Rollback deployment

## Workflow-Specific Gating Tests

## 1. User Story Creation Workflow

### Pre-Deployment Tests
```bash
# Test: Story Creation API Validation
test_story_creation_api() {
  # Validate required fields
  curl -X POST $API_BASE/api/stories \
    -H "Content-Type: application/json" \
    -d '{}' | grep -q "400" || fail "Missing validation"
  
  # Validate data types
  curl -X POST $API_BASE/api/stories \
    -H "Content-Type: application/json" \
    -d '{"storyPoints": "invalid"}' | grep -q "400" || fail "Type validation"
  
  # Test successful creation
  STORY_ID=$(curl -X POST $API_BASE/api/stories \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Story","description":"Test"}' | jq -r '.id')
  
  [[ "$STORY_ID" =~ ^[0-9]+$ ]] || fail "Story creation failed"
}

# Test: DynamoDB Connection
test_dynamodb_connection() {
  # Verify table exists
  aws dynamodb describe-table --table-name $STORIES_TABLE || fail "Stories table missing"
  aws dynamodb describe-table --table-name $ACCEPTANCE_TESTS_TABLE || fail "Tests table missing"
  
  # Test read/write permissions
  aws dynamodb put-item --table-name $STORIES_TABLE \
    --item '{"id":{"N":"999999"},"title":{"S":"test"}}' || fail "DynamoDB write failed"
  
  aws dynamodb delete-item --table-name $STORIES_TABLE \
    --key '{"id":{"N":"999999"}}' || fail "DynamoDB delete failed"
}

# Test: Frontend Configuration
test_frontend_config() {
  # Verify config.js exists and has required fields
  curl -s $FRONTEND_URL/config.js | grep -q "API_BASE_URL" || fail "Config missing API_BASE_URL"
  curl -s $FRONTEND_URL/config.js | grep -q "storiesTable" || fail "Config missing storiesTable"
  
  # Verify API endpoint is reachable from config
  API_URL=$(curl -s $FRONTEND_URL/config.js | grep -o "http://[^']*" | head -1)
  curl -s "$API_URL/health" | grep -q "running" || fail "API unreachable from config"
}
```

### Runtime Tests
```bash
# Test: Story CRUD Operations
test_story_crud() {
  # Create
  STORY=$(curl -X POST $API_BASE/api/stories \
    -H "Content-Type: application/json" \
    -d '{"title":"Gating Test Story","description":"Test CRUD"}')
  STORY_ID=$(echo $STORY | jq -r '.id')
  
  # Read
  curl -s $API_BASE/api/stories/$STORY_ID | grep -q "Gating Test Story" || fail "Story read failed"
  
  # Update
  curl -X PUT $API_BASE/api/stories/$STORY_ID \
    -H "Content-Type: application/json" \
    -d '{"title":"Updated Story","description":"Updated"}' || fail "Story update failed"
  
  # Delete
  curl -X DELETE $API_BASE/api/stories/$STORY_ID || fail "Story delete failed"
}

# Test: UI Rendering
test_ui_rendering() {
  # Verify outline renders
  curl -s $FRONTEND_URL | grep -q "outline-tree" || fail "Outline element missing"
  
  # Verify mindmap renders  
  curl -s $FRONTEND_URL | grep -q "mindmap-canvas" || fail "Mindmap element missing"
  
  # Verify details panel renders
  curl -s $FRONTEND_URL | grep -q "details-panel" || fail "Details panel missing"
}
```

### Post-Deployment Tests
```bash
# Test: End-to-End Story Creation
test_e2e_story_creation() {
  # Create story via API
  STORY_ID=$(curl -X POST $API_BASE/api/stories \
    -H "Content-Type: application/json" \
    -d '{"title":"E2E Test","description":"End-to-end test"}' | jq -r '.id')
  
  # Verify in database
  aws dynamodb get-item --table-name $STORIES_TABLE \
    --key "{\"id\":{\"N\":\"$STORY_ID\"}}" | grep -q "E2E Test" || fail "Story not in DB"
  
  # Verify in API response
  curl -s $API_BASE/api/stories | jq -r '.[].title' | grep -q "E2E Test" || fail "Story not in API"
  
  # Cleanup
  curl -X DELETE $API_BASE/api/stories/$STORY_ID
}
```

## 2. Code Generation Workflow

### Pre-Deployment Tests
```bash
# Test: Kiro CLI Availability
test_kiro_cli_availability() {
  # Check Kiro CLI is installed
  which kiro-cli || fail "Kiro CLI not installed"
  
  # Test Kiro CLI basic functionality
  echo "test" | kiro-cli chat --non-interactive || fail "Kiro CLI not working"
  
  # Verify Kiro API server is running
  curl -s $KIRO_API_BASE/health | grep -q "kiroProcess.*running" || fail "Kiro process not running"
}

# Test: Template System
test_template_system() {
  # Verify template files exist
  [[ -f "./templates/code-generation.md" ]] || fail "Code generation template missing"
  [[ -f "./templates/user-story-generation.md" ]] || fail "User story template missing"
  
  # Validate template structure
  grep -q "## Instructions" ./templates/code-generation.md || fail "Template format invalid"
  
  # Test template API endpoint
  curl -s $KIRO_API_BASE/api/templates | grep -q "code-generation" || fail "Template API failed"
}

# Test: GitHub Integration
test_github_integration() {
  # Verify GitHub token is configured
  [[ -n "$GITHUB_TOKEN" ]] || fail "GITHUB_TOKEN not set"
  
  # Test GitHub API access
  curl -H "Authorization: Bearer $GITHUB_TOKEN" \
    https://api.github.com/repos/demian7575/aipm | grep -q "demian7575" || fail "GitHub API access failed"
  
  # Verify repository access
  curl -H "Authorization: Bearer $GITHUB_TOKEN" \
    https://api.github.com/repos/demian7575/aipm/branches | grep -q "main" || fail "Repository access failed"
}
```

### Runtime Tests
```bash
# Test: Code Generation Request Processing
test_code_generation_processing() {
  # Submit code generation request
  RESPONSE=$(curl -X POST $KIRO_API_BASE/api/generate-code-branch \
    -H "Content-Type: application/json" \
    -d '{"storyId":1,"prNumber":999,"prompt":"Create a simple test function"}')
  
  # Verify request accepted
  echo $RESPONSE | grep -q "success.*true" || fail "Code generation request rejected"
  
  # Wait for processing (with timeout)
  for i in {1..30}; do
    sleep 2
    STATUS=$(curl -s $KIRO_API_BASE/api/code-generation-status/999 | jq -r '.status')
    [[ "$STATUS" == "completed" ]] && break
    [[ $i -eq 30 ]] && fail "Code generation timeout"
  done
}

# Test: Template Processing
test_template_processing() {
  # Test template execution
  RESULT=$(curl -X POST $KIRO_API_BASE/api/templates/execute \
    -H "Content-Type: application/json" \
    -d '{"templateId":"user-story-generation","input":{"feature":"test feature"}}')
  
  # Verify template processed
  echo $RESULT | grep -q "success" || fail "Template processing failed"
}
```

### Post-Deployment Tests
```bash
# Test: End-to-End Code Generation
test_e2e_code_generation() {
  # Create test story
  STORY_ID=$(curl -X POST $API_BASE/api/stories \
    -H "Content-Type: application/json" \
    -d '{"title":"Code Gen Test","description":"Test code generation"}' | jq -r '.id')
  
  # Create test PR
  PR_RESPONSE=$(curl -X POST $API_BASE/api/create-pr \
    -H "Content-Type: application/json" \
    -d "{\"storyId\":$STORY_ID,\"branchName\":\"test-branch-$(date +%s)\",\"prTitle\":\"Test PR\"}")
  
  PR_NUMBER=$(echo $PR_RESPONSE | jq -r '.number')
  
  # Generate code
  curl -X POST $KIRO_API_BASE/api/generate-code-branch \
    -H "Content-Type: application/json" \
    -d "{\"storyId\":$STORY_ID,\"prNumber\":$PR_NUMBER,\"prompt\":\"Create test file\"}"
  
  # Verify code was generated (check GitHub)
  sleep 10
  curl -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/demian7575/aipm/pulls/$PR_NUMBER/files" | \
    grep -q "filename" || fail "No files generated"
  
  # Cleanup
  curl -X DELETE $API_BASE/api/stories/$STORY_ID
}
```

## 3. PR Deployment Workflow

### Pre-Deployment Tests
```bash
# Test: GitHub Actions Configuration
test_github_actions_config() {
  # Verify workflow files exist
  [[ -f ".github/workflows/deploy-pr-to-dev.yml" ]] || fail "PR deployment workflow missing"
  [[ -f ".github/workflows/production-deploy.yml" ]] || fail "Production workflow missing"
  
  # Validate workflow syntax
  grep -q "on:" .github/workflows/deploy-pr-to-dev.yml || fail "Workflow syntax invalid"
  grep -q "pull_request" .github/workflows/deploy-pr-to-dev.yml || fail "PR trigger missing"
}

# Test: AWS Credentials
test_aws_credentials() {
  # Verify AWS CLI is configured
  aws sts get-caller-identity || fail "AWS credentials not configured"
  
  # Test S3 access
  aws s3 ls s3://aipm-deployments-728378229251/ || fail "S3 deployment bucket access failed"
  
  # Test EC2 access (SSH key)
  ssh -o ConnectTimeout=5 -o BatchMode=yes ec2-user@44.222.168.46 'echo "SSH OK"' || fail "EC2 SSH access failed"
}

# Test: Deployment Prerequisites
test_deployment_prerequisites() {
  # Verify backend files exist
  [[ -f "apps/backend/app.js" ]] || fail "Backend app.js missing"
  [[ -f "apps/backend/server.js" ]] || fail "Backend server.js missing"
  
  # Verify frontend files exist
  [[ -f "apps/frontend/public/index.html" ]] || fail "Frontend index.html missing"
  [[ -f "apps/frontend/public/app.js" ]] || fail "Frontend app.js missing"
  
  # Verify configuration files
  [[ -f "config-dev.js" ]] || fail "Development config missing"
  [[ -f "deploy-config.yaml" ]] || fail "Deploy config missing"
}
```

### Runtime Tests
```bash
# Test: Deployment Process
test_deployment_process() {
  # Test backend deployment API
  curl -X POST $DEV_API_BASE/api/deploy-backend \
    -H "Content-Type: application/json" \
    -d '{"s3Bucket":"test-bucket","s3Key":"test-key"}' | \
    grep -q "error.*Missing" || fail "Deploy API not validating"
  
  # Test data sync API
  curl -X POST $DEV_API_BASE/api/sync-data | \
    grep -q "success" || fail "Data sync API failed"
}

# Test: Health Checks
test_health_checks() {
  # Test main backend health
  curl -s $API_BASE/health | grep -q "running" || fail "Main backend health failed"
  
  # Test Kiro API health
  curl -s $KIRO_API_BASE/health | grep -q "running" || fail "Kiro API health failed"
  
  # Test frontend accessibility
  curl -s $FRONTEND_URL | grep -q "AI Project Manager" || fail "Frontend not accessible"
}
```

### Post-Deployment Tests
```bash
# Test: Deployment Verification
test_deployment_verification() {
  # Verify services are running
  ssh ec2-user@44.222.168.46 'ps aux | grep -E "(node|kiro)" | grep -v grep' | \
    wc -l | grep -q "[3-9]" || fail "Services not running"
  
  # Verify data synchronization
  PROD_COUNT=$(curl -s $PROD_API_BASE/api/stories | jq length)
  DEV_COUNT=$(curl -s $DEV_API_BASE/api/stories | jq length)
  [[ "$PROD_COUNT" -eq "$DEV_COUNT" ]] || fail "Data not synchronized"
  
  # Test end-to-end functionality
  curl -s $DEV_FRONTEND_URL | grep -q "AI Project Manager" || fail "Development frontend failed"
}
```

## 4. Data Synchronization Workflow

### Pre-Deployment Tests
```bash
# Test: DynamoDB Access
test_dynamodb_access() {
  # Test production table access
  aws dynamodb describe-table --table-name aipm-backend-prod-stories || fail "Prod stories table access failed"
  aws dynamodb describe-table --table-name aipm-backend-prod-acceptance-tests || fail "Prod tests table access failed"
  
  # Test development table access
  aws dynamodb describe-table --table-name aipm-backend-dev-stories || fail "Dev stories table access failed"
  aws dynamodb describe-table --table-name aipm-backend-dev-acceptance-tests || fail "Dev tests table access failed"
}

# Test: Sync API Endpoint
test_sync_api_endpoint() {
  # Verify sync endpoint exists
  curl -s $DEV_API_BASE/api/sync-data -X POST | \
    grep -q "success\|error" || fail "Sync endpoint not responding"
}
```

### Runtime Tests
```bash
# Test: Data Synchronization Process
test_data_sync_process() {
  # Get initial counts
  PROD_INITIAL=$(aws dynamodb scan --table-name aipm-backend-prod-stories --select COUNT | jq -r '.Count')
  DEV_INITIAL=$(aws dynamodb scan --table-name aipm-backend-dev-stories --select COUNT | jq -r '.Count')
  
  # Trigger sync
  SYNC_RESULT=$(curl -X POST $DEV_API_BASE/api/sync-data)
  
  # Verify sync completed
  echo $SYNC_RESULT | grep -q "success.*true" || fail "Sync failed"
  
  # Verify counts match
  DEV_FINAL=$(aws dynamodb scan --table-name aipm-backend-dev-stories --select COUNT | jq -r '.Count')
  [[ "$PROD_INITIAL" -eq "$DEV_FINAL" ]] || fail "Sync count mismatch"
}

# Test: Batch Operations
test_batch_operations() {
  # Test batch write limits (DynamoDB limit is 25 items)
  # This should be handled automatically by the sync process
  
  # Verify no partial failures
  SYNC_RESULT=$(curl -X POST $DEV_API_BASE/api/sync-data)
  echo $SYNC_RESULT | grep -q "UnprocessedItems" && fail "Batch operation partial failure"
}
```

### Post-Deployment Tests
```bash
# Test: Data Integrity
test_data_integrity() {
  # Compare sample records between prod and dev
  PROD_SAMPLE=$(aws dynamodb scan --table-name aipm-backend-prod-stories --limit 5)
  DEV_SAMPLE=$(aws dynamodb scan --table-name aipm-backend-dev-stories --limit 5)
  
  # Extract and compare IDs
  PROD_IDS=$(echo $PROD_SAMPLE | jq -r '.Items[].id.N' | sort)
  DEV_IDS=$(echo $DEV_SAMPLE | jq -r '.Items[].id.N' | sort)
  
  # Verify some overlap (not necessarily identical due to timing)
  COMMON_IDS=$(comm -12 <(echo "$PROD_IDS") <(echo "$DEV_IDS") | wc -l)
  [[ "$COMMON_IDS" -gt 0 ]] || fail "No common data after sync"
}
```

## 5. GitHub Actions CI/CD Workflow

### Pre-Deployment Tests
```bash
# Test: Workflow Syntax
test_workflow_syntax() {
  # Validate YAML syntax
  python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-pr-to-dev.yml'))" || fail "Workflow YAML invalid"
  
  # Check required secrets
  grep -q "AWS_ACCESS_KEY_ID" .github/workflows/deploy-pr-to-dev.yml || fail "AWS secrets missing"
  grep -q "AWS_SECRET_ACCESS_KEY" .github/workflows/deploy-pr-to-dev.yml || fail "AWS secrets missing"
}

# Test: Action Dependencies
test_action_dependencies() {
  # Verify required actions exist
  grep -q "actions/checkout@v3" .github/workflows/deploy-pr-to-dev.yml || fail "Checkout action missing"
  grep -q "aws-actions/configure-aws-credentials" .github/workflows/deploy-pr-to-dev.yml || fail "AWS action missing"
}
```

### Runtime Tests
```bash
# Test: Workflow Triggers
test_workflow_triggers() {
  # This would be tested by actually triggering workflows
  # For gating tests, we verify the trigger configuration
  grep -q "pull_request:" .github/workflows/deploy-pr-to-dev.yml || fail "PR trigger missing"
  grep -q "workflow_dispatch:" .github/workflows/deploy-pr-to-dev.yml || fail "Manual trigger missing"
}
```

### Post-Deployment Tests
```bash
# Test: Workflow Execution Results
test_workflow_results() {
  # Verify deployment artifacts exist
  aws s3 ls s3://aipm-dev-frontend-hosting/ | grep -q "index.html" || fail "Frontend not deployed"
  
  # Verify backend is updated
  ssh ec2-user@44.222.168.46 'ls -la /home/ec2-user/aipm/apps/backend/app.js' || fail "Backend not deployed"
  
  # Verify services restarted
  ssh ec2-user@44.222.168.46 'systemctl is-active kiro-api-v4' | grep -q "active" || fail "Services not restarted"
}
```

## Comprehensive Test Execution Plan

### Test Execution Order
1. **Pre-Deployment Tests** (Block deployment on failure)
2. **Deployment Process** (Monitor and log)
3. **Post-Deployment Tests** (Rollback on failure)
4. **Runtime Tests** (Continuous monitoring)

### Test Implementation Structure
```bash
#!/bin/bash
# Master Gating Test Runner

run_workflow_gating_tests() {
  local workflow=$1
  local environment=$2
  
  echo "🧪 Testing $workflow workflow in $environment"
  
  # Pre-deployment
  run_pre_deployment_tests $workflow $environment || return 1
  
  # Runtime (if not pre-deployment phase)
  if [[ "$PHASE" != "pre-deployment" ]]; then
    run_runtime_tests $workflow $environment || return 1
  fi
  
  # Post-deployment (if deployment phase)
  if [[ "$PHASE" == "post-deployment" ]]; then
    run_post_deployment_tests $workflow $environment || return 1
  fi
  
  echo "✅ $workflow workflow tests passed"
}

# Execute all workflow tests
main() {
  local workflows=("story-creation" "code-generation" "pr-deployment" "data-sync" "ci-cd")
  local environments=("development" "production")
  
  for workflow in "${workflows[@]}"; do
    for env in "${environments[@]}"; do
      run_workflow_gating_tests $workflow $env || {
        echo "❌ Gating tests failed for $workflow in $env"
        exit 1
      }
    done
  done
  
  echo "🎉 All workflow gating tests passed!"
}
```

This comprehensive gating test plan ensures each workflow is thoroughly validated before, during, and after deployment, preventing the types of issues we've encountered and maintaining system reliability.
