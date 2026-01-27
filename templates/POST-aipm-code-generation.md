# Code Generation Contract

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

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

# Check if gating tests should be skipped (for development/testing)
if [[ "${SKIP_GATING_TESTS:-false}" == "true" ]]; then
    echo "⚠️  Skipping gating tests (SKIP_GATING_TESTS=true)"
else
    # Run Phase 1 and 2 - MUST PASS
    echo "🧪 Running gating tests (Phase 1, 2, 4)..."
    GATING_OUTPUT=$(bash scripts/testing/run-structured-gating-tests.sh --phases 1,2 2>&1)
    echo "$GATING_OUTPUT" | tail -100
    
    # Check Phase 1,2 passed
    if ! echo "$GATING_OUTPUT" | grep -q "ALL GATING TESTS PASSED"; then
        echo "❌ Phase 1,2 failed - reverting changes"
        git reset --hard HEAD
        exit 1
    fi
    
    # Run Phase 4 to test new functionality
    echo "🧪 Running Phase 4 (story-specific tests)..."
    bash scripts/testing/phase4-functionality.sh
fi

echo "✅ Tests passed or skipped - proceeding to commit"
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


## INPUT
Variables provided in the prompt:
```
storyId: number       # Story ID
prNumber: number      # GitHub PR reference
branchName: string    # Git branch name
requestId: string     # Request ID for API response
```
