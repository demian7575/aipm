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

### 1. Fetch Data (MCP)
- `get_story({ storyId: <use storyId variable> })` → Get story details and acceptance tests
- `git_prepare_branch({ branchName: <use branchName variable> })` → Prepare git branch
  - If status ≠ 'ready': Report error and STOP

### 2. Analyze Codebase
- Review: `apps/frontend/public/app.js`, `apps/backend/app.js`, `scripts/kiro-api-server-v4.js`
- Identify: Integration points, patterns, conventions

### 3. Implement
Write code following story requirements and existing patterns

### 4. Verify Code (MANDATORY)
- Use MCP: `verify_code({ filePath: "apps/frontend/public/app.js" })`
- Check: syntaxValid = true, bracesBalanced = true
- If fails: Fix and retry (max 3 attempts)
- If still failing: Report failure and STOP

### 5. Run Gating Tests (MANDATORY)
- Use MCP: `run_tests({ timeout: 60 })`
- Check: success = true, failed = 0
- If fails: Fix code and return to step 3 (max 3 attempts)
- If still failing: Report failure and STOP

### 6. Commit & Push (MCP)
- `git_commit_and_push({ branchName: <use branchName variable>, commitMessage: "feat: <story title>" })`
- If success = false: Report error and STOP

### 7. Report
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
Variables provided in the prompt:
```
storyId: number       # Use with get_story MCP tool
prNumber: number      # GitHub PR reference
branchName: string    # Use with git MCP tools
```
