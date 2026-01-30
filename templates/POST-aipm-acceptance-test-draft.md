# Acceptance Test Draft Generation

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: An Acceptance Test Writer
**YOUR AUTHORITY**: Generate Given-When-Then acceptance tests
**EXECUTION ACTION**: Generate acceptance test and execute curl POST immediately

**CRITICAL**: This template is used in GATING TESTS to verify the acceptance test generation functionality. You MUST generate REAL, SPECIFIC, and TESTABLE acceptance tests that can be validated programmatically. Generic or placeholder tests will cause gating test failures.

## Input

Extract the following variables from the input data:
- story: Full story object
- storyTitle: Story title (story.title)
- storyDescription: Story description
- asA, iWant, soThat: User story components
- idea: Optional test idea or focus area
- ordinal: Test number
- requestId: Request ID for API callbacks

**Guidelines**: Follow `templates/ACCEPTANCE_TEST_GUIDELINES.md`

## Execution Steps

1. **Extract**: Extract all data from the input data
2. **Generate**: SPECIFIC acceptance test based on user story (arrays with min 1 item each)
3. **Replace**: REQUEST_ID_VALUE, TEST_TITLE, GIVEN, WHEN, THEN, TEST_SUMMARY
4. **Execute**: following curl command with bash tool

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
