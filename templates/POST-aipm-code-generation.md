# Code Generation Contract

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

## Input

The input data is provided in the ---INPUT--- section below. Extract the story and generation parameters.

```
---INPUT---
{
  "story": {
    "id": 0,
    "title": "string",
    "description": "string",
    "acceptanceTests": [...]
  },
  "branchName": "string",
  "prNumber": 0,
  "skipGatingTests": false
}
---INPUT---
```

## Variables available:
- story: Full story object
- storyId: Story ID (story.id)
- storyTitle: Story title
- storyDescription: Story description
- acceptanceTests: Array of acceptance tests
- branchName: Git branch name
- prNumber: GitHub PR number
- skipGatingTests: Skip gating tests flag
- requestId: Request ID for API callbacks

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
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Using provided story data...\"}"

# Story data is already provided in input, no need to fetch
```



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

Analayze Code Base and Identify Integration points, patterns, conventions



### 4. Implement
```bash
# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Generating code...\"}"
```

Write code following story requirements to satisfy Acceptnace tests and existing patterns
Implement acceptance tests to phase4-functionality.sh"
```



### 5. Run Gating Tests (MANDATORY)
```bash
# Send progress update
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Running gating tests...\"}"

# Check if gating tests should be skipped
if [ "{skipGatingTests}" == "true" ]; then
  echo "Skipping gating tests (running during Phase 2 E2E tests)"
  # Proceed directly to Step 6
else
  # Run Phase 1 and 2 and newly added Phase 4 tests
  cd /home/ec2-user/aipm
  bash scripts/testing/phase1-basic-api.sh
  bash scripts/testing/phase2-e2e-workflows.sh
  
  # If tests fail: Revert changes and return to step 4 (max 3 attempts)
  if [ $? -ne 0 ]; then
    echo "Gating tests failed"
    git reset --hard HEAD
    # Return error - will retry in step 4
    exit 1
  fi
fi

# Check output for: "ALL GATING TESTS PASSED" (Phase 1,2) and story test passes
# If fails: Fix code and return to step 4 (max 3 attempts)
```



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
```
echo "✅ Completion response sent to Semantic API"

**IMPORTANT**: This step is MANDATORY. Without it, the request will timeout.

## CODE REQUIREMENTS
- Follow existing AIPM patterns
- Add error handling (try-catch)
- Add JSDoc comments
- No breaking changes
- Minimize duplication
- Keep simple and clear
