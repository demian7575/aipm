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
curl -s http://localhost:4000/api/stories/{storyId}
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

### 6. Commit & Push
```bash
cd /home/ec2-user/aipm
git add -A
git commit -m "feat: {story title}"
git push origin {branchName}
```

### 7. Report via API
```bash
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "{REQUEST_ID}",
    "status": "success|failure",
    "filesModified": ["modified files"],
    "summary": "Description",
    "testResults": "test results"
  }'
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
```

## INPUT
Variables provided in the prompt:
```
storyId: number       # Story ID
prNumber: number      # GitHub PR reference
branchName: string    # Git branch name
requestId: string     # Request ID for API response
```
