# Code Generation Contract

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

## Input

Extract the following variables from the input data:
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
**MODE**: Step-by-step execution
**RULE**: Each STEP must complete successfully before the next STEP starts
**EXECUTE**: Complete workflow immediately without questions or explanations

## EXECUTION MODEL
- Each STEP is executed in an isolated bash execution
- Exit code determines STEP success or failure
- Failure aborts the workflow immediately
- Progress is reported via curl inside each STEP

## CONDITIONAL EXECUTION

**IF skipGatingTests is true**: Skip Step 5 (gating tests). Execute Steps 1-4, then jump directly to Step 6.
**IF skipGatingTests is false**: Execute all steps 1-7 including Step 5 (gating tests).

## WORKFLOW

**IMPORTANT**: Execute each step immediately using bash tool. Send progress updates after each step.

Step 1. Fetch Data

cd /home/ec2-user/aipm
REQUEST_ID="{requestId}"
echo "[$(date +%H:%M:%S)] Step 1: Using provided story data"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Using provided story data...\"}"

Step 2. Prepare Git Branch

PRECONDITION: Step 1 completed successfully

echo "[$(date +%H:%M:%S)] Step 2: Preparing git branch"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Preparing git branch...\"}"
git reset --hard HEAD
git clean -fd
git fetch origin
git checkout {branchName}
git rebase origin/main

Step 3. Analyze Codebase

PRECONDITION: Step 2 completed successfully

echo "[$(date +%H:%M:%S)] Step 3: Analyzing codebase"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Analyzing codebase...\"}"

Analayze Code Base and Identify Integration points, patterns, conventions

Step 4. Implement

PRECONDITION: Step 3 completed successfully

echo "[$(date +%H:%M:%S)] Step 4: Generating code"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Generating code...\"}"

Write code following story requirements to satisfy acceptance tests and existing patterns:
- Follow existing AIPM patterns
- Add error handling (try-catch)
- Add JSDoc comments
- No breaking changes
- Minimize duplication
- Keep simple and clear
- Implement acceptance tests to phase4-functionality.sh

Step 5. Run Gating Tests (MANDATORY - unless skipGatingTests is true)

PRECONDITION: Step 4 completed successfully

echo "[$(date +%H:%M:%S)] Step 5: Running gating tests"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Running gating tests...\"}"
bash scripts/testing/phase1-basic-api.sh
bash scripts/testing/phase2-e2e-workflows.sh
bash scripts/testing/phase4-functionality.sh {storyId}
if [ $? -ne 0 ]; then
  echo "Gating tests failed"
  git reset --hard HEAD
  exit 1
fi
echo "[$(date +%H:%M:%S)] Step 5: Gating tests completed"

Step 6. Commit & Push

PRECONDITION: Step 5 completed successfully (or skipped if skipGatingTests is true)

echo "[$(date +%H:%M:%S)] Step 6: Committing and pushing"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{\"requestId\": \"$REQUEST_ID\", \"status\": \"progress\", \"message\": \"Committing and pushing code...\"}"
git add -A
git commit -m "feat: {story title}"
git push origin {branchName}

Step 7. Report Completion (MANDATORY - DO NOT SKIP)

PRECONDITION: Step 6 completed successfully

echo "[$(date +%H:%M:%S)] Step 7: Reporting completion"
REQUEST_ID="{requestId}"
curl -X POST http://localhost:8083/api/code-generation-response -H 'Content-Type: application/json' -d "{
    \"requestId\": \"$REQUEST_ID\",
    \"status\": \"complete\",
    \"filesModified\": [\"apps/backend/app.js\", \"apps/frontend/public/app.js\"],
    \"summary\": \"Code generated and committed successfully\",
    \"testResults\": \"Gating tests passed\"
  }"
