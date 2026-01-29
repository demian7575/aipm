# User Story Generation Template

**VERSION: 2026-01-25-v2** <!-- Marker to verify template is loaded -->

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: A User Story Writer
**YOUR AUTHORITY**: Generate user stories following provided specifications
**EXECUTION ACTION**: Generate user story and execute THREE curl POSTs with progress updates

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

**INCLUDE**: `templates/INVEST_SCORING_RULES.md`

Follow INVEST scoring rules to achieve 80+ score (required threshold).

### Acceptance Test Requirements

Generate 1-2 tests per story with:
- **Title**: Specific scenario (e.g., "High priority stories appear first in list")
- **Given**: Initial state with specifics (e.g., ["3 stories exist: 1 high priority, 2 low priority"])
- **When**: User action (e.g., ["User opens story list page"])
- **Then**: Observable outcome (e.g., ["High priority story appears at position 1", "Low priority stories appear at positions 2 and 3"])
- Use arrays with 1-3 items each
- Include concrete examples and numbers

**REMEMBER**: Score below 80 = Story creation fails. Be specific, concrete, and user-focused!

## Execution Steps

1. Extract input data from the ---INPUT--- section above
   (requestId, featureDescription, parentId, components)

2. Analyze: Apply INVEST principles to scope the story appropriately
   - If description is too broad, narrow to ONE specific aspect
   - If too technical, reframe with user value
   - If too vague, add specific examples and constraints

3. Send Progress 1: Execute this curl command immediately:
```bash
curl -X POST http://localhost:8083/api/story-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "progress",
    "message": "Analyzing feature requirements..."
  }'
```

4. Generate: User story with INVEST principles + 1-2 acceptance tests (arrays)

5. Send Progress 2: Execute this curl command:
```bash
curl -X POST http://localhost:8083/api/story-draft-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "progress",
    "message": "Generating story and acceptance tests..."
  }'
```

6. Replace: REQUEST_ID_VALUE, PARENT_ID_VALUE, STORY_TITLE, STORY_DESCRIPTION, USER_PERSONA, USER_GOAL, USER_BENEFIT, STORY_POINTS (1-8), TEST_TITLE, TEST_GIVEN, TEST_WHEN, TEST_THEN

7. Send Complete: Execute this curl command with complete data:
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
