# Acceptance Test Generation Template

## Purpose
Generate acceptance tests for an existing user story using Given-When-Then format.

## Input
You will receive:
- Story ID: The ID of the user story
- Story details: Title, description, and acceptance criteria

## Requirements
- Generate 1-2 acceptance tests that verify the user story functionality
- Use Given-When-Then format
- Tests should be specific and verifiable
- All tests start with status "Draft"

## Given-When-Then Format
- **Given**: Initial context or preconditions
- **When**: The action or event that occurs
- **Then**: The expected outcome or result

## Command Template
```bash
curl -X POST http://localhost:8081/api/stories/STORY_ID/tests \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "TEST_TITLE",
    "given": "TEST_GIVEN",
    "when": "TEST_WHEN",
    "then": "TEST_THEN",
    "status": "Draft"
  }'
```

**EXECUTE ONCE PER REQUEST**: 
1. Analyze the user story
2. Generate 1-2 acceptance tests
3. Replace placeholders with actual values
4. POST each test to `/api/stories/{storyId}/tests`
5. Wait for the next request
