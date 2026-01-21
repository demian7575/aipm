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

Create Phase 4 gating test based on acceptance tests from the story:
```bash
cd /home/ec2-user/aipm

# Copy template and customize for this story
cp scripts/testing/phase4-story-template.sh scripts/testing/phase4-story-{storyId}.sh

# Edit the test file to:
# 1. Set STORY_ID and STORY_TITLE
# 2. Add verification logic for each acceptance test
# 3. Verify Given-When-Then conditions are met
# 4. Make test executable: chmod +x scripts/testing/phase4-story-{storyId}.sh

# Example test structure:
# - Test 1: Verify Given conditions
# - Test 2: Execute When actions  
# - Test 3: Verify Then outcomes
```

### 5. Run Gating Tests (MANDATORY)
```bash
cd /home/ec2-user/aipm
bash scripts/testing/run-structured-gating-tests.sh --phases 1,2,3,4 2>&1 | tail -100
```
Check output for: "ALL GATING TESTS PASSED"
If fails: Fix code and return to step 4 (max 3 attempts)

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
