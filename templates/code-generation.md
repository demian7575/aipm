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

### 1. Fetch Data
```bash
cd /home/ec2-user/aipm
curl -s http://localhost:8081/api/stories/{storyId}
```
Parse JSON response to get story details and acceptance tests

### 2. Prepare Git Branch
```bash
cd /home/ec2-user/aipm
git reset --hard HEAD
git clean -fd
git fetch origin
git checkout {branchName}
git pull origin {branchName} --rebase || true
```

### 3. Analyze Codebase
- Review: `apps/frontend/public/app.js`, `apps/backend/app.js`
- Identify: Integration points, patterns, conventions

### 4. Implement
Write code following story requirements and existing patterns

### 5. Verify Code (MANDATORY)
```bash
cd /home/ec2-user/aipm
node -c apps/frontend/public/app.js
node -c apps/backend/app.js
```
If fails: Fix and retry (max 3 attempts)

### 6. Run Gating Tests (MANDATORY)
```bash
cd /home/ec2-user/aipm
bash scripts/testing/run-structured-gating-tests.sh --phases 1,2,3,4 2>&1 | tail -50
```
Check output for: "ALL GATING TESTS PASSED"
If fails: Fix code and return to step 4 (max 3 attempts)

### 7. Commit & Push
```bash
cd /home/ec2-user/aipm
git add -A
git commit -m "feat: {story title}"
git push origin {branchName}
```

### 8. Report
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
