# Code Generation

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: A Code Implementation Engineer
**YOUR AUTHORITY**: Generate code implementation for user stories
**EXECUTION ACTION**: Follow ALL execution steps below in order, then execute curl POST

## Input
- storyId: Story ID
- storyTitle: Story title
- storyDescription: Story description
- acceptanceTests: Array of acceptance tests
- branchName: Git branch name
- prNumber: PR number

## Output Schema
```json
{
  "status": "success|failure",
  "filesModified": ["string"],
  "summary": "string",
  "testResults": "string"
}
```

## API Command
```bash
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "STATUS",
    "filesModified": ["FILE"],
    "summary": "SUMMARY",
    "testResults": "TEST_RESULTS"
  }'
```

## Execution Steps

**CRITICAL**: Execute ALL steps in order. Do NOT skip any step.

1. **Extract Parameters**: 
   - Find "Request ID: XXXXX" and extract the UUID
   - Extract: storyId, storyTitle, storyDescription, acceptanceTests, branchName, prNumber

2. **Checkout Branch** (MANDATORY):
   ```bash
   cd /home/ec2-user/aipm
   git fetch origin
   git checkout {branchName}
   git pull origin {branchName} --rebase || true
   ```

3. **Implement Code** (MANDATORY):
   - Read story requirements from storyTitle, storyDescription, acceptanceTests
   - Modify files in /home/ec2-user/aipm/apps/frontend/public/app.js or apps/backend/app.js
   - Follow existing code patterns and conventions
   - Ensure all acceptance tests are satisfied

4. **Verify Syntax** (MANDATORY):
   ```bash
   cd /home/ec2-user/aipm
   node -c apps/frontend/public/app.js
   node -c apps/backend/app.js
   ```
   If syntax errors: Fix and retry

5. **Commit & Push** (MANDATORY):
   ```bash
   cd /home/ec2-user/aipm
   git add -A
   git commit -m "feat: {storyTitle}"
   git push origin {branchName}
   ```

6. **Prepare API Response**:
   - Replace REQUEST_ID_VALUE with the UUID from step 1
   - Replace STATUS with "success" or "failure"
   - Replace FILE with array of modified files
   - Replace SUMMARY with brief description of changes
   - Replace TEST_RESULTS with verification results

7. **Execute API Call** (MANDATORY):
   Run the curl command with replaced values
