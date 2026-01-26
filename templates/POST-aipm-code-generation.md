# Code Generation Contract

## INPUT VARIABLES
The prompt provides these variables:
- `storyId` - Story ID number
- `branchName` - Git branch name  
- `prNumber` - GitHub PR number

## ROLE
**YOU ARE**: Code Generator executing specifications exactly as written
**EXECUTE**: Complete workflow immediately without questions or explanations

## WORKFLOW

**IMPORTANT**: Send progress updates after each major step using curl to keep the connection alive.

### 1. Fetch Data
```bash
cd /home/ec2-user/aipm

# Send progress update
REQUEST_ID="{requestId}"
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Fetching story data...\"}"

curl -s http://localhost:4000/api/stories/{storyId}
```
Parse JSON response to get story details and acceptance tests

### 2. Prepare Git Branch
```bash
cd /home/ec2-user/aipm

# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Preparing git branch...\"}"

git reset --hard HEAD
git clean -fd
git fetch origin
git checkout {branchName}
git pull origin {branchName} --rebase || true
```

### 3. Analyze Codebase
```bash
# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Analyzing codebase...\"}"
```
- Review: `apps/frontend/public/app.js`, `apps/backend/app.js`
- Identify: Integration points, patterns, conventions

### 4. Implement
```bash
# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Generating code...\"}"
```
Write code following story requirements and existing patterns

Add Phase 4 gating test to the accumulated test file:
```bash
cd /home/ec2-user/aipm

# Generate safe function name from story title
STORY_FUNC=$(echo "{storyTitle}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//' | sed 's/_$//')

# Add test function to phase4-functionality.sh before "ADD NEW STORY TESTS" marker
cat >> /tmp/new_test.sh << 'TESTEOF'

# =============================================================================
# Story: {storyTitle}
# ID: {storyId}
# Merged: $(date +%Y-%m-%d)
# =============================================================================
test_${STORY_FUNC}() {
    log_test "{storyTitle}"
    
    # Test 1: [Add your first acceptance test verification]
    # Example: Check if feature exists in code
    # if ! grep -q "expectedFeature" apps/frontend/public/app.js; then
    #     fail_test "Feature not implemented"
    #     return 1
    # fi
    
    # Test 2: [Add your second acceptance test verification]
    # Test 3: [Add more tests as needed]
    
    pass_test "{storyTitle}"
    return 0
}
TESTEOF

# Insert before "ADD NEW STORY TESTS" line
sed -i '/# ADD NEW STORY TESTS BELOW THIS LINE/r /tmp/new_test.sh' scripts/testing/phase4-functionality.sh

# Add function call before "ADD NEW TEST FUNCTION CALLS" line
sed -i '/# ADD NEW TEST FUNCTION CALLS HERE/i\
if test_'"${STORY_FUNC}"'; then\
    ((PHASE4_PASSED++))\
else\
    ((PHASE4_FAILED++))\
fi\
' scripts/testing/phase4-functionality.sh

echo "✅ Added test_${STORY_FUNC} to phase4-functionality.sh"
```

### 5. Run Gating Tests (MANDATORY)
```bash
cd /home/ec2-user/aipm

# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Running gating tests...\"}"

# Check if gating tests should be skipped (for development/testing)
if [[ "${SKIP_GATING_TESTS:-false}" == "true" ]]; then
    echo "⚠️  Skipping gating tests (SKIP_GATING_TESTS=true)"
else
    # Run Phase 1 and 2 - MUST PASS (run once and save output)
    GATING_OUTPUT=$(bash scripts/testing/run-structured-gating-tests.sh --phases 1,2 2>&1)
    echo "$GATING_OUTPUT" | tail -100

    # Check Phase 1,2 passed
    if ! echo "$GATING_OUTPUT" | grep -q "ALL GATING TESTS PASSED"; then
        echo "Phase 1,2 failed - fix and retry"
        exit 1
    fi

    # Run Phase 4 to test your new functionality
    bash scripts/testing/phase4-functionality.sh
fi

# If tests passed or skipped, proceed to commit
```
Check output for: "ALL GATING TESTS PASSED" (Phase 1,2) and story test passes
If fails: Fix code and return to step 4 (max 3 attempts)

### 6. Commit & Push
```bash
cd /home/ec2-user/aipm

# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Committing and pushing code...\"}"

git add -A
git commit -m "feat: {story title}"
git push origin {branchName}
```

### 7. Report Completion (MANDATORY - DO NOT SKIP)
```bash
cd /home/ec2-user/aipm

# CRITICAL: Send completion response to Semantic API
# This MUST be executed after git push succeeds
REQUEST_ID="{requestId}"

curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{
    \"requestId\": \"$REQUEST_ID\",
    \"status\": \"complete\",
    \"filesModified\": [\"apps/backend/app.js\", \"apps/frontend/public/app.js\"],
    \"summary\": \"Code generated and committed successfully\",
    \"testResults\": \"Gating tests passed\"
  }"

echo "✅ Completion response sent to Semantic API"
```

**IMPORTANT**: This step is MANDATORY. Without it, the request will timeout.

## CODE REQUIREMENTS
- Follow existing AIPM patterns
- Add error handling (try-catch)
- Add JSDoc comments
- No breaking changes
- Minimize duplication
- Keep simple and clear

## FILE STRUCTURE
```
apps/frontend/public/app.js    # Frontend logic
apps/backend/app.js             # Backend API
```

## INPUT
Variables provided in the prompt:
```
storyId: number       # Story ID
prNumber: number      # GitHub PR reference
branchName: string    # Git branch name
requestId: string     # Request ID for API response
```
