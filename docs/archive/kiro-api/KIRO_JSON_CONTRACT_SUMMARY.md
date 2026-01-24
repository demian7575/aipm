# Kiro JSON Contract Architecture - Executive Summary

## The Solution to Kiro CLI Limitations

### Problem Recap
Kiro CLI is conversational, not API-oriented:
- ❌ Doesn't follow strict schemas
- ❌ Context pollution across requests
- ❌ Slow response times (60+ seconds)
- ❌ Unpredictable behavior

### Solution: JSON-to-JSON Contracts

**Treat Kiro CLI as a JSON transformation engine, not a conversational AI.**

```
Input JSON → Transformation Rules → Output JSON
```

## Core Architecture

### 1. Contract Definition

Every operation has a **contract** that defines:

```json
{
  "contractId": "enhance-story-v1",
  "inputSchema": {
    "required": ["storyId", "title", "description", ...],
    "properties": { ... }
  },
  "outputSchema": {
    "required": ["storyId", "title", "description", "acceptanceCriteria", ...],
    "properties": { ... }
  },
  "transformationRules": [
    "Preserve storyId exactly",
    "Enhance title to be specific",
    "Generate 3-5 acceptance criteria",
    ...
  ],
  "dynamodbMapping": {
    "table": "aipm-backend-prod-stories",
    "inputFields": [...],
    "outputFields": [...]
  }
}
```

### 2. Data Flow

```
┌─────────────┐
│  DynamoDB   │ ──read──▶ Input JSON
└─────────────┘
                              │
                              │ transform
                              ▼
                         Kiro CLI
                              │
                              │ validate
                              ▼
                         Output JSON
                              │
                              │ write
                              ▼
┌─────────────┐
│  DynamoDB   │
└─────────────┘
```

### 3. Async Queue Processing

```
Frontend → Lambda → Queue → Worker → Kiro API → Kiro CLI
   │                                                  │
   │◀─────────── poll status ────────────────────────┘
```

**Benefits**:
- Frontend gets immediate response (202 Accepted)
- Worker processes in background
- No timeout issues
- Scalable

## Key Principles

### Principle 1: Explicit Contracts

**Before** (Conversational):
```
"Enhance this story... please make it better... return JSON..."
```
- Vague
- Unpredictable
- Hard to test

**After** (Contract-Based):
```json
{
  "contractId": "enhance-story-v1",
  "inputJson": { "storyId": "123", "title": "..." },
  "transformationRules": [
    "Preserve storyId exactly",
    "Enhance title to be specific",
    ...
  ]
}
```
- Clear
- Predictable
- Testable

### Principle 2: 1:1 DynamoDB Alignment

**Input JSON = DynamoDB Read Format**
```javascript
const story = await dynamodb.get({ Key: { id: storyId } });
const inputJson = {
  storyId: story.id,
  title: story.title,
  description: story.description,
  ...
};
```

**Output JSON = DynamoDB Write Format**
```javascript
await dynamodb.update({
  Key: { id: outputJson.storyId },
  UpdateExpression: 'SET title = :title, description = :desc, ...',
  ExpressionAttributeValues: {
    ':title': outputJson.title,
    ':desc': outputJson.description,
    ...
  }
});
```

**No impedance mismatch** - JSON structure matches DynamoDB schema exactly.

### Principle 3: Transformation Rules as Documentation

```json
{
  "transformationRules": [
    "1. Preserve storyId exactly as provided",
    "2. Enhance title to be specific and actionable",
    "3. Expand description with technical details",
    "4. Refine asA to specify user role precisely",
    "5. Improve iWant to describe specific functionality",
    "6. Enhance soThat to articulate clear business value",
    "7. Generate 3-5 acceptance criteria based on story content",
    "8. Set enhanced=true",
    "9. Set enhancedAt to current ISO8601 timestamp"
  ]
}
```

**These rules are**:
- ✅ Human-readable documentation
- ✅ Machine-executable instructions
- ✅ Version-controlled
- ✅ Testable

### Principle 4: Schema Validation at Boundaries

```javascript
// Validate input
validateSchema(inputJson, contract.inputSchema);

// Transform
const outputJson = await transform(inputJson);

// Validate output
validateSchema(outputJson, contract.outputSchema);
```

**Catch errors early**:
- Invalid input → Reject before sending to Kiro
- Invalid output → Reject before writing to DynamoDB
- Clear error messages

## Example: Enhance Story

### Input (from DynamoDB)
```json
{
  "storyId": "story-123",
  "title": "Implement login",
  "description": "Add login page",
  "asA": "user",
  "iWant": "to login",
  "soThat": "I can access the system",
  "storyPoint": 5
}
```

### Transformation Prompt
```
You are a JSON transformation service.

INPUT JSON:
{
  "storyId": "story-123",
  "title": "Implement login",
  ...
}

TRANSFORMATION RULES:
1. Preserve storyId exactly: "story-123"
2. Enhance title to be specific and actionable
3. Expand description with technical details
4. Refine asA to specify user role precisely
5. Improve iWant to describe specific functionality
6. Enhance soThat to articulate clear business value
7. Generate 3-5 acceptance criteria
8. Set enhanced=true
9. Set enhancedAt to current ISO8601 timestamp

OUTPUT SCHEMA:
{
  "type": "object",
  "required": ["storyId", "title", "description", "asA", "iWant", "soThat", "acceptanceCriteria", "enhanced"],
  ...
}

CRITICAL: Return ONLY valid JSON matching the output schema.
No markdown, no explanations. Start with { and end with }.
```

### Output (to DynamoDB)
```json
{
  "storyId": "story-123",
  "title": "Implement secure email/password authentication with session management",
  "description": "Create a login page with form validation, secure password handling, and session token generation. Include error handling for invalid credentials and account lockout after failed attempts.",
  "asA": "registered user with valid credentials",
  "iWant": "to securely authenticate using my email and password",
  "soThat": "I can access my personalized dashboard and protected application features",
  "storyPoint": 5,
  "acceptanceCriteria": [
    "Login form validates email format before submission",
    "Password is masked during input and transmitted securely",
    "Invalid credentials display clear error message",
    "Successful login redirects to dashboard with valid session token",
    "Account locks after 5 failed login attempts within 15 minutes"
  ],
  "enhanced": true,
  "enhancedAt": "2025-12-17T22:31:15.000Z"
}
```

## Comparison: Before vs After

| Aspect | Before (Conversational) | After (Contract-Based) |
|--------|------------------------|------------------------|
| **Request** | Vague prompt | Structured JSON + rules |
| **Response** | Unpredictable text | Validated JSON |
| **Schema** | Ignored | Enforced |
| **DynamoDB** | Manual mapping | 1:1 alignment |
| **Testing** | Flaky | Reliable |
| **Documentation** | Scattered | In contract |
| **Versioning** | None | Contract versions |
| **Async** | Timeout issues | Queue-based |

## Implementation Files

### Created
1. `docs/KIRO_JSON_CONTRACT_SPEC.md` - Full specification
2. `docs/KIRO_JSON_CONTRACT_ARCHITECTURE.md` - Architecture diagram
3. `scripts/contracts/contracts.json` - Contract definitions
4. `docs/KIRO_JSON_CONTRACT_SUMMARY.md` - This document

### To Create
1. `scripts/kiro-api-server-v3.js` - Contract-based API server
2. `scripts/kiro-worker.js` - Queue processor
3. `scripts/contracts/validator.js` - Schema validator
4. `infrastructure/kiro-queue-table.yml` - Queue table CloudFormation

## Next Steps

### Phase 1: Implement Contract System
1. Create contract loader
2. Update Kiro API to use contracts
3. Implement schema validation
4. Test with one contract (enhance-story)

### Phase 2: Add Queue Processing
1. Create DynamoDB queue table
2. Implement worker process
3. Add task status polling
4. Update frontend to use async pattern

### Phase 3: Migrate Endpoints
1. Migrate enhance-story
2. Migrate generate-acceptance-test
3. Migrate analyze-invest
4. Deprecate old endpoints

### Phase 4: Monitor and Optimize
1. Track queue depth
2. Monitor processing times
3. Optimize slow contracts
4. Add retry logic

## Success Criteria

✅ **Predictable**: Same input → same output
✅ **Fast**: <10s per transformation
✅ **Reliable**: >95% success rate
✅ **Scalable**: Handle 100+ concurrent requests
✅ **Maintainable**: Add new contracts without code changes
✅ **Testable**: Automated contract validation

## Conclusion

By treating Kiro CLI as a **JSON transformation engine** with **explicit contracts** that align **1:1 with DynamoDB**, we solve all the limitations:

- ✅ Schema compliance (enforced by validation)
- ✅ No context pollution (fresh session per task)
- ✅ Fast response (async queue processing)
- ✅ Predictable behavior (explicit transformation rules)

The contract-based architecture provides:
- Clear documentation
- Reliable testing
- Easy extensibility
- Seamless DynamoDB integration
- Predictable signal propagation

**This is the right architecture for using Kiro CLI in a production API.**
