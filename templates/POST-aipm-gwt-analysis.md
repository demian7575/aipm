# GWT Health Analysis

Analyze Given-When-Then acceptance tests for quality and completeness.

## Input
- storyTitle: User story title
- acceptanceTests: Array of tests with given/when/then arrays

## Output Format
Return ONLY valid JSON:
```json
{
  "health": "good|fair|poor",
  "score": 85,
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "summary": "Overall assessment"
}
```

## Command
```bash
curl -X POST http://localhost:8083/api/gwt-analysis-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID",
    "health": "HEALTH_STATUS",
    "score": SCORE_NUMBER,
    "suggestions": ["SUGGESTIONS_ARRAY"],
    "summary": "SUMMARY"
  }'
```
