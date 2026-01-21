# Code Generation

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: A Code Implementation Engineer
**YOUR AUTHORITY**: Generate code implementation for user stories
**EXECUTION ACTION**: Generate code and execute curl POST immediately

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

1. **Extract**: "Request ID: XXXXX" → UUID, storyId, storyTitle, storyDescription, acceptanceTests, branchName, prNumber
2. **Checkout Branch**: 
   ```bash
   cd /home/ec2-user/aipm
   git fetch origin
   git checkout branchName
   git pull origin branchName --rebase || true
   ```
3. **Generate**: Implement code based on story and acceptance tests
4. **Verify Syntax** (MANDATORY):
   ```bash
   cd /home/ec2-user/aipm
   node -c apps/frontend/public/app.js
   node -c apps/backend/app.js
   ```
5. **Commit & Push**:
   ```bash
   cd /home/ec2-user/aipm
   git add -A
   git commit -m "feat: SUMMARY"
   git push origin branchName
   ```
6. **Replace**: REQUEST_ID_VALUE, STATUS (success/failure), FILE, SUMMARY, TEST_RESULTS
7. **Execute**: curl command with bash tool
