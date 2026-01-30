# User Story Generation Template

**VERSION: 2026-01-25-v2** <!-- Marker to verify template is loaded -->

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`
**INCLUDE**: `templates/INVEST_SCORING_RULES.md`
**INCLUDE**: `templates/POST-aipm-acceptance-test-draft.md`

**YOU ARE**: A User Story Writer
**YOUR AUTHORITY**: Generate user stories following provided specifications
**EXECUTION ACTION**: Generate user story and execute curl POST with complete data

## Input

Extract the following variables from the input data:
- featureDescription: Feature to implement
- parentId: Parent story ID (or null)
- parent: Full parent story object (if parentId provided)
- components: Component array
- requestId: Request ID for API callbacks

## Execution Steps

1. Extract input data from the input data

2. Analyze: Apply INVEST principles to scope the story appropriately

3. Generate: User story with INVEST principles to achieve 80+ score (required threshold). Generate 1-2 acceptance tests per story following the acceptance test guidelines

4. Replace: REQUEST_ID_VALUE, PARENT_ID_VALUE, STORY_TITLE, STORY_DESCRIPTION, USER_PERSONA, USER_GOAL, USER_BENEFIT, STORY_POINTS (1-8), TEST_TITLE, TEST_GIVEN, TEST_WHEN, TEST_THEN

5. Send Complete: Execute following curl command with complete data

curl -X POST http://localhost:8083/api/story-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "complete",
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

**CRITICAL**: You MUST execute the curl command using bash tool
