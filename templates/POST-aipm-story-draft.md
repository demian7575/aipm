# User Story Generation Template

**VERSION: 2026-01-25-v2** <!-- Marker to verify template is loaded -->

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: A User Story Writer
**YOUR AUTHORITY**: Generate user stories following provided specifications
**EXECUTION ACTION**: Generate user story and execute THREE curl POSTs with progress updates

## Input

Extract the following variables from the input data:
- featureDescription: Feature to implement
- parentId: Parent story ID (or null)
- parent: Full parent story object (if parentId provided)
- components: Component array
- requestId: Request ID for API callbacks

## Generation Rules

**INCLUDE**: `templates/INVEST_SCORING_RULES.md`

Follow INVEST scoring rules to achieve 80+ score (required threshold).

### Acceptance Test Requirements

**INCLUDE**: `templates/POST-aipm-acceptance-test-draft.md`

Generate 1-2 tests per story following the acceptance test guidelines.

## Execution Steps

1. Extract input data from the input data

2. Analyze: Apply INVEST principles to scope the story appropriately
   - If description is too broad, narrow to ONE specific aspect
   - If too technical, reframe with user value
   - If too vague, add specific examples and constraints

3. Send Progress 1: Execute following curl command immediately

4. Generate: User story with INVEST principles + 1-2 acceptance tests (arrays)

5. Send Progress 2: Execute following curl command

6. Replace: REQUEST_ID_VALUE, PARENT_ID_VALUE, STORY_TITLE, STORY_DESCRIPTION, USER_PERSONA, USER_GOAL, USER_BENEFIT, STORY_POINTS (1-8), TEST_TITLE, TEST_GIVEN, TEST_WHEN, TEST_THEN

7. Send Complete: Execute following curl command with complete data

## API Commands

### Progress 1
```bash
curl -X POST http://localhost:8083/api/story-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "progress",
    "message": "Analyzing feature requirements..."
  }'
```

### Progress 2
```bash
curl -X POST http://localhost:8083/api/story-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "progress",
    "message": "Generating story and acceptance tests..."
  }'
```

### Complete Response
```bash
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
```

**CRITICAL**: You MUST execute ALL THREE curl commands using bash tool
