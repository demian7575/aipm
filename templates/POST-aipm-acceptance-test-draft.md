# Acceptance Test Draft Generation

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: An Acceptance Test Writer
**YOUR AUTHORITY**: Generate Given-When-Then acceptance tests
**EXECUTION ACTION**: Generate acceptance test and execute curl POST immediately

**CRITICAL**: This template is used in GATING TESTS to verify the acceptance test generation functionality. You MUST generate REAL, SPECIFIC, and TESTABLE acceptance tests that can be validated programmatically. Generic or placeholder tests will cause gating test failures.

## Input

The input data is provided in the ---INPUT--- section below. Extract the story object and generate an acceptance test.

```
---INPUT---
{
  "story": {
    "id": 0,
    "title": "string",
    "description": "string",
    "asA": "string",
    "iWant": "string",
    "soThat": "string",
    "acceptanceTests": [...]
  },
  "idea": "string (optional)",
  "ordinal": 0
}
---INPUT---
```

## Output Schema
```json
{
  "title": "Test title",
  "given": ["precondition"],
  "when": ["action"],
  "then": ["result"],
  "source": "ai",
  "summary": "Brief explanation"
}
```

**Guidelines**: Follow `templates/ACCEPTANCE_TEST_GUIDELINES.md`
- Arrays must have min 1 item each
- Be specific and measurable
- Include concrete values, endpoints, or UI elements
- Avoid generic phrases like "system works" or "feature is available"
- Make assertions verifiable (e.g., "API returns 200 status" not "API works")

## API Command
```bash
curl -X POST http://localhost:8083/api/acceptance-test-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "complete",
    "title": "TEST_TITLE",
    "given": ["GIVEN"],
    "when": ["WHEN"],
    "then": ["THEN"],
    "source": "ai",
    "summary": "TEST_SUMMARY"
  }'
```

## Execution Steps

1. **Extract**: "Request ID: XXXXX" → UUID, story.title, story.description, story.asA, story.iWant, story.soThat, idea, ordinal
2. **Generate**: SPECIFIC acceptance test based on user story (arrays with min 1 item each)
3. **Replace**: REQUEST_ID_VALUE, TEST_TITLE, GIVEN, WHEN, THEN, TEST_SUMMARY
4. **Execute**: curl command with bash tool
