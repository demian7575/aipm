# INVEST Analysis - Execute Immediately

**EXECUTE THIS ANALYSIS NOW - DO NOT ASK FOR INPUT**

## Story Data (PROVIDED):
- **Title**: {{title}}
- **As a**: {{asA}}
- **I want**: {{iWant}}
- **So that**: {{soThat}}
- **Description**: {{description}}
- **Story Points**: {{storyPoint}}
- **Components**: {{components}}
- **Acceptance Tests**: {{acceptanceTestCount}} tests defined

## REQUIRED ACTION: Analyze the above story data against INVEST criteria

### Independent
- Can this story be developed independently of other stories?

### Negotiable
- Can story details be discussed and refined?

### Valuable
- Does story deliver clear business or user value?

### Estimable
- Can the development effort be reasonably estimated?

### Small
- Is this story appropriately sized for a single iteration?

### Testable
- Are there clear acceptance criteria?

## MANDATORY EXECUTION

**STEP 1**: Analyze the story data above
**STEP 2**: Create JSON with your analysis
**STEP 3**: Execute this exact command:

```bash
curl -X POST http://localhost:8081/api/invest-response -H 'Content-Type: application/json' -d '{"summary":"Your analysis summary","score":75,"warnings":[],"strengths":[],"source":"ai","model":"kiro-cli"}'
```

**EXECUTE NOW - NO QUESTIONS - NO WAITING FOR INPUT**
