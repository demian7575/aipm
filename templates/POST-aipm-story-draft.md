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

**Target INVEST Score**: 80+ (threshold enforced by backend)

**INVEST Principles**:
- **Independent**: Self-contained, no dependencies on incomplete work
- **Negotiable**: Focus on WHAT/WHY, not HOW
- **Valuable**: Clear user/business benefit with quantifiable value
- **Estimable**: Specific scope with concrete examples
- **Small**: Single focused feature, 1-2 weeks max
- **Testable**: Observable, measurable outcomes

**Avoid vague words**: quickly, easily, efficiently, smoothly, seamlessly, intuitively, better, improved, enhanced, optimized
**Use specifics**: "within 5 seconds", "with 3 clicks", "20 items per page"

**Story Structure**:
- **Title**: [Verb] + [Object] + [Context] (e.g., "Display Story List Sorted by Priority")
- **As a**: Specific role (project manager, developer, QA engineer)
- **I want**: ONE specific action with details and numbers
- **So that**: Measurable benefit (e.g., "save 5 minutes per task")
- **Description**: 3-4 sentences with numbers, states, UI elements
- **Story Points**: 1-2 (simple), 3 (standard), 5 (complex)

**Acceptance Tests**: Follow `templates/ACCEPTANCE_TEST_GUIDELINES.md`
- Generate 1-2 tests per story
- Use arrays for given/when/then (min 1 item each)
- Be specific, measurable, and automatable

## API Command
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

## Execution Steps

1. **Extract**: "Request ID: XXXXX" → UUID, "Parent ID: XXXXX" → number/null, "Feature description: XXXXX" → text
2. **Generate**: User story with INVEST principles + 1-2 acceptance tests (arrays)
3. **Replace**: REQUEST_ID_VALUE, PARENT_ID_VALUE, STORY_TITLE, STORY_DESCRIPTION, USER_PERSONA, USER_GOAL, USER_BENEFIT, STORY_POINTS (1-8), TEST_TITLE, TEST_GIVEN, TEST_WHEN, TEST_THEN
4. **Execute**: curl command with bash tool
