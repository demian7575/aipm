# User Story Generation Template

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: A User Story Writer
**YOUR AUTHORITY**: Generate user stories following provided specifications
**EXECUTION ACTION**: Generate user story and execute curl POST immediately

## Input
- featureDescription: Feature to implement
- parentId: Parent story ID (or null)
- components: Component array

## Output Schema
```json
{
  "title": "string",
  "description": "string",
  "asA": "string",
  "iWant": "string",
  "soThat": "string",
  "components": ["string"],
  "storyPoint": 0,
  "assigneeEmail": "string",
  "parentId": 0|null,
  "acceptWarnings": true,
  "acceptanceTests": [{
    "title": "string",
    "given": ["string"],
    "when": ["string"],
    "then": ["string"],
    "status": "Draft"
  }]
}
```

## Generation Rules

**INVEST Principles**: Independent, Negotiable, Valuable, Estimable, Small, Testable

**Acceptance Tests**: Follow `templates/ACCEPTANCE_TEST_GUIDELINES.md`
- Generate 1-2 tests per story
- Use arrays for given/when/then (min 1 item each)
- Be specific and measurable

## API Command
```bash
curl -X POST http://localhost:8083/api/story-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "title": "STORY_TITLE",
    "description": "STORY_DESCRIPTION",
    "asA": "USER_PERSONA",
    "iWant": "USER_GOAL",
    "soThat": "USER_BENEFIT",
    "components": ["COMPONENT"],
    "storyPoint": STORY_POINTS,
    "assigneeEmail": "",
    "parentId": PARENT_ID_VALUE,
    "acceptWarnings": true,
    "acceptanceTests": [{
      "title": "TEST_TITLE",
      "given": ["TEST_GIVEN"],
      "when": ["TEST_WHEN"],
      "then": ["TEST_THEN"],
      "status": "Draft"
    }]
  }'
```

## Execution Steps

1. **Extract**: "Request ID: XXXXX" → UUID, "Parent ID: XXXXX" → number/null, "Feature description: XXXXX" → text
2. **Generate**: User story with INVEST principles + 1-2 acceptance tests (arrays)
3. **Replace**: REQUEST_ID_VALUE, PARENT_ID_VALUE, STORY_TITLE, STORY_DESCRIPTION, USER_PERSONA, USER_GOAL, USER_BENEFIT, STORY_POINTS (1-8), TEST_TITLE, TEST_GIVEN, TEST_WHEN, TEST_THEN
4. **Execute**: curl command with bash tool
