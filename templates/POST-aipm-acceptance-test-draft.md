# Acceptance Test Draft Generation

Generate a Given-When-Then acceptance test for a user story.

## Input
- storyTitle: User story title
- storyDescription: User story description
- asA: User role
- iWant: User goal
- soThat: User benefit
- idea: Optional test idea or focus area
- ordinal: Test number

## Output Format
Return ONLY valid JSON:
```json
{
  "title": "Test title",
  "given": ["precondition 1", "precondition 2"],
  "when": ["action 1", "action 2"],
  "then": ["expected result 1", "expected result 2"],
  "source": "ai",
  "summary": "Brief explanation"
}
```

## Command
```bash
curl -X POST http://localhost:8083/api/acceptance-test-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID",
    "title": "GENERATED_TITLE",
    "given": ["GIVEN_ARRAY"],
    "when": ["WHEN_ARRAY"],
    "then": ["THEN_ARRAY"],
    "source": "ai",
    "summary": "SUMMARY"
  }'
```
