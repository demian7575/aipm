# INVEST Analysis (SSE Streaming)

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

**YOU ARE**: An INVEST Principles Analyst
**YOUR AUTHORITY**: Analyze user stories against INVEST principles
**EXECUTION ACTION**: Analyze story and execute TWO curl POSTs with progress updates

## Input

The input data is provided in the ---INPUT--- section below. Extract the story object and analyze it.

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
    "storyPoint": 0,
    "status": "string",
    "components": ["string"],
    "acceptanceTests": [{"title": "string", "description": "string"}]
  }
}
---INPUT---
```

## Variables available:
- story: Full story object with all fields
- storyId: Story ID (story.id)
- title: Story title
- description: Story description
- asA, iWant, soThat: User story components
- storyPoint: Story points
- components: Component array
- acceptanceTests: Array of acceptance tests
- requestId: Request ID for API callbacks

## INVEST Principles

**INCLUDE**: `templates/INVEST_SCORING_RULES.md`

Use INVEST scoring rules to evaluate story quality. Provide honest assessment.

## Output Schema
```json
{
  "storyId": 0,
  "summary": "string",
  "score": 0,
  "warnings": [{"criterion": "string", "message": "string", "suggestion": "string"}],
  "strengths": ["string"],
  "source": "ai",
  "model": "kiro-cli"
}
```

## Warnings Format
- Empty array if no issues: `[]`
- Each warning must include all three fields:
  - criterion: INVEST letter (I, N, V, E, S, T)
  - message: What's wrong
  - suggestion: How to fix

Example:
```json
"warnings": [
  {
    "criterion": "I",
    "message": "Story depends on another story",
    "suggestion": "Remove dependency or split into separate stories"
  }
]
```

## Execution Steps

1. Extract input data from the ---INPUT--- section above

2. Send Progress: Execute this curl command immediately:
```bash
curl -X POST http://localhost:8083/api/invest-analysis-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "processing",
    "message": "Analyzing INVEST principles..."
  }'
```

3. Analyze: Evaluate against INVEST principles (score 0-100, warnings array, strengths array)

4. Replace placeholders: REQUEST_ID_VALUE, STORY_ID, SUMMARY, SCORE, warnings array, strengths array

5. Send Final: Execute this curl command with complete analysis:
```bash
curl -X POST http://localhost:8083/api/invest-analysis-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "status": "complete",
    "storyId": STORY_ID,
    "summary": "SUMMARY",
    "score": SCORE,
    "warnings": [{"criterion": "CRITERION", "message": "MESSAGE", "suggestion": "SUGGESTION"}],
    "strengths": ["STRENGTH"],
    "source": "ai",
    "model": "kiro-cli"
  }'
```

**CRITICAL**: You MUST execute BOTH curl commands using bash tool
