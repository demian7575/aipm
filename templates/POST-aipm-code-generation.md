# Code Generation

Generate code implementation for user story.

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
  "status": "success|failed",
  "filesModified": ["file1.js", "file2.js"],
  "summary": "Implementation summary",
  "testResults": "Test execution results"
}
```

## Instructions
1. Analyze story requirements
2. Generate implementation code
3. Verify syntax
4. Return summary

## Command
```bash
curl -X POST http://localhost:8083/api/code-generation-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID",
    "status": "STATUS",
    "filesModified": ["FILES"],
    "summary": "SUMMARY",
    "testResults": "RESULTS"
  }'
```

Execute curl immediately after generating code.
