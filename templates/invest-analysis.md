# INVEST Analysis Template

Analyze the following user story against INVEST criteria and provide detailed feedback.

## Story Details
- **Title**: {{title}}
- **As a**: {{asA}}
- **I want**: {{iWant}}
- **So that**: {{soThat}}
- **Description**: {{description}}
- **Story Points**: {{storyPoint}}
- **Components**: {{components}}
- **Acceptance Tests**: {{acceptanceTestCount}} tests defined

## INVEST Criteria Analysis

Evaluate each criterion and provide specific feedback:

### Independent
- Can this story be developed independently of other stories?
- Are there minimal dependencies that would block development?

### Negotiable
- Is the scope flexible and open to discussion?
- Can requirements be adjusted based on constraints?

### Valuable
- Does this story provide clear business value?
- Is the "so that" clause meaningful and specific?

### Estimable
- Can the development effort be reasonably estimated?
- Is the story clear enough to plan implementation?

### Small
- Is this story appropriately sized for a single iteration?
- Can it be completed within one sprint?

### Testable
- Are there clear acceptance criteria?
- Can success be objectively measured?

## Required Output Format

Respond with valid JSON only:

```json
{
  "summary": "Brief overall assessment of story quality",
  "score": 85,
  "warnings": [
    {
      "criterion": "small",
      "message": "Story appears too large for single sprint",
      "suggestion": "Consider breaking into smaller stories"
    }
  ],
  "strengths": [
    "Clear business value stated",
    "Well-defined acceptance criteria"
  ],
  "source": "ai",
  "model": "kiro-cli"
}
```

## EXECUTION COMMAND

**MANDATORY**: After completing your analysis, execute this curl command immediately:

```bash
curl -X POST http://localhost:8081/api/invest-response \
  -H 'Content-Type: application/json' \
  -d 'YOUR_JSON_ANALYSIS_HERE'
```

**CRITICAL**: Replace `YOUR_JSON_ANALYSIS_HERE` with your actual JSON analysis from above.
**NO QUESTIONS**: Do not ask for clarification
**NO EXPLANATIONS**: Do not explain what you're doing  
**EXECUTE CURL**: POST the analysis to the API endpoint immediately

Provide constructive, actionable feedback focused on improving story quality.
