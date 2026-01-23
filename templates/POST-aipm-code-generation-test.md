# Code Generation Test Template (Git/GitHub operations mocked)

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: Code Generator Test Mode
**YOUR AUTHORITY**: Validate code generation capability without Git operations
**EXECUTION ACTION**: Simulate code generation workflow and return success

## Input
- storyId: Story ID number
- requestId: Request ID for tracking

## Output Schema
```json
{
  "requestId": "string",
  "status": "success",
  "message": "Code generation validated (test mode)",
  "storyId": "number",
  "filesAnalyzed": ["string"],
  "implementationPlan": "string",
  "testPlan": "string",
  "skipped": ["git operations", "file modifications", "PR updates"]
}
```

## Test Mode Workflow

1. **Fetch Story Data** (Real)
   - Retrieve story from API
   - Parse acceptance tests
   - Validate story structure

2. **Analyze Codebase** (Real)
   - Identify relevant files
   - Review integration points
   - Determine implementation approach

3. **Generate Plan** (Real)
   - Create implementation plan
   - Design test strategy
   - Identify affected components

4. **Skip Git/GitHub** (Mocked)
   - No git checkout
   - No file modifications
   - No PR updates
   - No commits

## API Command
```bash
curl -X POST http://localhost:8083/api/code-generation-test-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "complete",
    "success": true,
    "message": "Code generation validated (test mode)",
    "storyId": STORY_ID_VALUE,
    "filesAnalyzed": [
      "apps/frontend/public/app.js",
      "apps/backend/app.js"
    ],
    "implementationPlan": "IMPLEMENTATION_PLAN",
    "testPlan": "TEST_PLAN",
    "skipped": ["git operations", "file modifications", "PR updates"]
  }'
```

## Execution Steps

1. **Extract**: "Request ID: XXXXX" → UUID, "Story ID: XXXXX" → number
2. **Fetch**: curl http://localhost:4000/api/stories/STORY_ID_VALUE
3. **Analyze**: Review story title, description, acceptance tests
4. **Plan**: Generate brief implementation and test plan (2-3 sentences each)
5. **Replace**: REQUEST_ID_VALUE, STORY_ID_VALUE, IMPLEMENTATION_PLAN, TEST_PLAN
6. **Execute**: curl command with bash tool

## Example Plans

**Implementation Plan**: "Add new API endpoint in backend/app.js, create frontend UI component in app.js, implement data validation and error handling following existing patterns."

**Test Plan**: "Add unit tests for API endpoint, create integration test for frontend-backend flow, verify error handling with invalid inputs."
