# Acceptance Test Generation

Generate acceptance tests in Given-When-Then format.

## Input
- storyId: Story ID
- storyTitle: Story title
- storyDescription: Story description
- idea: Optional test idea

## Output Schema
```json
{
  "title": "Test title",
  "given": "Precondition",
  "when": "Action",
  "then": "Expected result",
  "status": "Draft"
}
```

## Instructions
1. Analyze the story
2. Generate 1-2 acceptance tests
3. Use Given-When-Then format
4. Return JSON array

## Command
```bash
curl -X POST http://localhost:8083/api/acceptance-test-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID",
    "tests": [
      {
        "title": "TEST_TITLE",
        "given": "GIVEN_CONDITION",
        "when": "WHEN_ACTION",
        "then": "THEN_RESULT",
        "status": "Draft"
      }
    ]
  }'
```

Execute curl immediately after generating tests.
