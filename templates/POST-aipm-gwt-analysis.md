# GWT Health Analysis

Analyze acceptance test quality (Given-When-Then format).

## Input
- title: Test title
- given: Given condition
- when: When action
- then: Then result

## Analysis Criteria
- Clarity
- Completeness
- Testability
- Specificity

## Output Schema
```json
{
  "health": "good|warning|poor",
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}
```

## Command
```bash
curl -X POST http://localhost:8083/api/gwt-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID",
    "health": "HEALTH_STATUS",
    "issues": ["ISSUE_LIST"],
    "suggestions": ["SUGGESTION_LIST"]
  }'
```

Execute curl immediately after analysis.
