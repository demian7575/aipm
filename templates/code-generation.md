# Code Generation Contract

## ROLE
**YOU ARE**: Code Generator executing specifications exactly as written
**EXECUTE**: Complete workflow immediately without questions or explanations

## WORKFLOW

### 1. Fetch Data (MCP)
- `get_story({ storyId: STORY_ID })` → Get story details and acceptance tests
- `git_prepare_branch({ branchName: BRANCH_NAME })` → Prepare git branch
  - If status ≠ 'ready': Report error and STOP

### 2. Analyze Codebase
- Review: `apps/frontend/public/app.js`, `apps/backend/app.js`, `scripts/kiro-api-server-v4.js`
- Identify: Integration points, patterns, conventions

### 3. Implement (Max 5 iterations)
```
LOOP until all acceptance tests pass OR 5 iterations:
  a. Write code following story requirements
  b. Run: `./scripts/testing/run-structured-gating-tests.sh`
  c. If tests fail: Fix issues and repeat
  d. If iteration 5 and tests fail: Report failure and STOP
```

### 4. Quality Check (MANDATORY)
- Syntax: `node -c apps/frontend/public/app.js` (must pass)
- Braces: Verify balanced opening/closing
- Tests: All acceptance tests pass
- If ANY fail: Fix and return to step 3

### 5. Commit & Push (MCP)
- `git_commit_and_push({ branchName: BRANCH_NAME, commitMessage: "feat: TASK_TITLE" })`
- If success = false: Report error and STOP

### 6. Report
```json
{
  "status": "success|failure",
  "message": "Description",
  "files": ["modified files"],
  "commitHash": "hash",
  "testsPass": true|false
}
```

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
scripts/kiro-api-server-v4.js   # Kiro API
```

## INPUT
```yaml
storyId: number       # Use get_story MCP tool
prNumber: number      # GitHub PR
branchName: string    # Git branch
```
