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

### 3. Implement (Max 5 iterations)
```
LOOP until code is valid OR 5 iterations:
  a. Write code following story requirements
  b. Use MCP: verify_code({ filePath: "apps/frontend/public/app.js" })
  c. If verification fails: Fix issues and repeat
  d. If iteration 5 and still failing: Report failure and STOP
```

### 4. Quality Check (MANDATORY)
- Use MCP: verify_code for all modified files
- Verify: syntaxValid = true, bracesBalanced = true
- If ANY fail: Fix and return to step 3

### 5. Commit & Push (MCP)
- `git_commit_and_push({ branchName: <use branchName variable>, commitMessage: "feat: <story title>" })`
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
Variables provided in the prompt:
```
storyId: number       # Use with get_story MCP tool
prNumber: number      # GitHub PR reference
branchName: string    # Use with git MCP tools
```
