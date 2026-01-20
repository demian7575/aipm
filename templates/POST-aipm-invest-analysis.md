# INVEST Analysis

Analyze user story against INVEST principles.

## Input
- title: Story title
- description: Story description
- asA: User role
- iWant: User goal
- soThat: User benefit

## INVEST Principles
- Independent
- Negotiable
- Valuable
- Estimable
- Small
- Testable

## Output Schema
```json
{
  "overall": "pass|fail",
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}
```

## Command
```bash
curl -X POST http://localhost:8083/api/invest-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID",
    "overall": "PASS_OR_FAIL",
    "issues": ["ISSUE_LIST"],
    "suggestions": ["SUGGESTION_LIST"]
  }'
```

Execute curl immediately after analysis.
