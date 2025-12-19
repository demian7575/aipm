# Kiro API JSON Contract Specification

## Core Principle

**The Kiro API defines a strict JSON-to-JSON transformation contract.**

```
Input JSON (DynamoDB) → Kiro CLI → Output JSON (DynamoDB)
```

- Input schema = DynamoDB read format
- Output schema = DynamoDB write format
- Transformation logic = Explicit prompt instructions
- 1:1 alignment with data model

## Contract Structure

### Contract Definition

```json
{
  "contractId": "enhance-story-v1",
  "version": "1.0",
  "description": "Enhance user story with INVEST principles",
  
  "inputSchema": {
    "type": "object",
    "required": ["storyId", "title", "description", "asA", "iWant", "soThat"],
    "properties": {
      "storyId": {"type": "string"},
      "title": {"type": "string"},
      "description": {"type": "string"},
      "asA": {"type": "string"},
      "iWant": {"type": "string"},
      "soThat": {"type": "string"},
      "storyPoint": {"type": "number"},
      "parentId": {"type": "string"},
      "components": {"type": "array", "items": {"type": "string"}}
    }
  },
  
  "outputSchema": {
    "type": "object",
    "required": ["storyId", "title", "description", "asA", "iWant", "soThat", "acceptanceCriteria", "enhanced"],
    "properties": {
      "storyId": {"type": "string"},
      "title": {"type": "string"},
      "description": {"type": "string"},
      "asA": {"type": "string"},
      "iWant": {"type": "string"},
      "soThat": {"type": "string"},
      "storyPoint": {"type": "number"},
      "acceptanceCriteria": {"type": "array", "items": {"type": "string"}},
      "enhanced": {"type": "boolean"},
      "enhancedAt": {"type": "string", "format": "iso8601"}
    }
  },
  
  "transformationRules": [
    "1. Preserve storyId exactly as provided in input",
    "2. Enhance title to be more specific and actionable",
    "3. Expand description with technical details and context",
    "4. Refine asA to specify user role more precisely",
    "5. Improve iWant to describe specific functionality",
    "6. Enhance soThat to articulate clear business value",
    "7. Generate 3-5 acceptance criteria based on story content",
    "8. Set enhanced=true",
    "9. Set enhancedAt to current ISO8601 timestamp"
  ],
  
  "dynamodbMapping": {
    "table": "aipm-backend-prod-stories",
    "partitionKey": "id",
    "inputFields": ["id", "title", "description", "asA", "iWant", "soThat", "storyPoint", "parentId", "components"],
    "outputFields": ["id", "title", "description", "asA", "iWant", "soThat", "storyPoint", "acceptanceCriteria", "enhanced", "enhancedAt", "updatedAt"]
  }
}
```

## Example Contracts

### Contract 1: enhance-story

**Input JSON** (from DynamoDB):
```json
{
  "storyId": "story-123",
  "title": "Implement login",
  "description": "Add login page",
  "asA": "user",
  "iWant": "to login",
  "soThat": "I can access the system",
  "storyPoint": 5,
  "parentId": "story-100",
  "components": ["Authentication"]
}
```

**Transformation Prompt**:
```
You are a JSON transformation service.

INPUT JSON:
{input_json}

TRANSFORMATION RULES:
1. Preserve storyId exactly: "{storyId}"
2. Enhance title to be specific and actionable (current: "{title}")
3. Expand description with technical details (current: "{description}")
4. Refine asA to specify role precisely (current: "{asA}")
5. Improve iWant to describe specific functionality (current: "{iWant}")
6. Enhance soThat to articulate business value (current: "{soThat}")
7. Generate 3-5 acceptance criteria based on story
8. Set enhanced=true
9. Set enhancedAt to current ISO8601 timestamp

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON
- Match output schema exactly
- No markdown, no explanations
- All required fields must be present

OUTPUT SCHEMA:
{output_schema}

Return the transformed JSON now:
```

**Output JSON** (to DynamoDB):
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
    "Invalid credentials display clear error message without revealing which field is wrong",
    "Successful login redirects to dashboard with valid session token",
    "Account locks after 5 failed login attempts within 15 minutes"
  ],
  "enhanced": true,
  "enhancedAt": "2025-12-17T22:31:00.000Z"
}
```

### Contract 2: generate-acceptance-test

**Input JSON** (from DynamoDB):
```json
{
  "testId": "test-456",
  "storyId": "story-123",
  "ordinal": 1,
  "reason": "Verify successful login flow",
  "context": "User has valid credentials"
}
```

**Transformation Prompt**:
```
You are a JSON transformation service.

INPUT JSON:
{input_json}

STORY CONTEXT (from DynamoDB):
{story_json}

TRANSFORMATION RULES:
1. Preserve testId exactly: "{testId}"
2. Preserve storyId exactly: "{storyId}"
3. Generate descriptive title based on reason and context
4. Create 2-3 Given conditions (preconditions)
5. Create 2-3 When actions (user actions)
6. Create 2-3 Then outcomes (expected results)
7. Set status="Draft"
8. Set createdAt to current ISO8601 timestamp

OUTPUT SCHEMA:
{output_schema}

Return the transformed JSON now:
```

**Output JSON** (to DynamoDB):
```json
{
  "testId": "test-456",
  "storyId": "story-123",
  "ordinal": 1,
  "title": "Successful login with valid email and password",
  "given": [
    "User has registered account with email 'user@example.com'",
    "User is on the login page",
    "Account is not locked"
  ],
  "when": [
    "User enters valid email address",
    "User enters correct password",
    "User clicks 'Login' button"
  ],
  "then": [
    "User is redirected to dashboard page",
    "Session token is created and stored",
    "Welcome message displays user's name"
  ],
  "status": "Draft",
  "createdAt": "2025-12-17T22:31:00.000Z"
}
```

### Contract 3: analyze-invest

**Input JSON** (from DynamoDB):
```json
{
  "storyId": "story-123",
  "title": "Implement secure email/password authentication",
  "description": "Create login page with validation...",
  "asA": "registered user",
  "iWant": "to securely authenticate",
  "soThat": "I can access protected features",
  "storyPoint": 5,
  "components": ["Authentication", "UI"]
}
```

**Transformation Prompt**:
```
You are a JSON transformation service.

INPUT JSON:
{input_json}

TRANSFORMATION RULES:
1. Preserve storyId exactly: "{storyId}"
2. Analyze against INVEST criteria:
   - Independent: Can be developed without dependencies?
   - Negotiable: Implementation details flexible?
   - Valuable: Provides clear user/business value?
   - Estimable: Effort can be reasonably estimated?
   - Small: Fits in single sprint (1-2 weeks)?
   - Testable: Can define clear acceptance criteria?
3. Calculate score (0-100) based on criteria
4. Generate summary (1-2 sentences)
5. List warnings (issues found)
6. List suggestions (improvements)
7. For each criterion, provide pass/fail and feedback

OUTPUT SCHEMA:
{output_schema}

Return the transformed JSON now:
```

**Output JSON** (to DynamoDB):
```json
{
  "storyId": "story-123",
  "score": 85,
  "summary": "Story is well-defined with clear value, but may be too large for single sprint.",
  "warnings": [
    "Story point 5 suggests complexity that may exceed sprint capacity",
    "Multiple components (Authentication, UI) indicate potential for splitting"
  ],
  "suggestions": [
    "Consider splitting into 'Backend Authentication' and 'Login UI' stories",
    "Add specific security requirements (e.g., password hashing algorithm)",
    "Define error handling scenarios explicitly"
  ],
  "criteria": {
    "independent": {
      "pass": true,
      "feedback": "Can be developed without dependencies on other stories"
    },
    "negotiable": {
      "pass": true,
      "feedback": "Implementation details (UI framework, auth library) are flexible"
    },
    "valuable": {
      "pass": true,
      "feedback": "Clear user value: secure access to protected features"
    },
    "estimable": {
      "pass": true,
      "feedback": "5 story points indicates team can estimate effort"
    },
    "small": {
      "pass": false,
      "feedback": "5 points may be too large; consider splitting into 2-3 point stories"
    },
    "testable": {
      "pass": true,
      "feedback": "Clear acceptance criteria can be defined for authentication flow"
    }
  },
  "analyzedAt": "2025-12-17T22:31:00.000Z"
}
```

## DynamoDB Integration

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         AIPM Frontend                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /api/stories/enhance
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda API Handler                          │
│                                                                   │
│  1. Validate request                                             │
│  2. Read from DynamoDB (get current story)                       │
│  3. Build input JSON from DynamoDB item                          │
│  4. Send to Kiro API                                             │
│  5. Receive output JSON from Kiro API                            │
│  6. Validate output against schema                               │
│  7. Write to DynamoDB (update story)                             │
│  8. Return response to frontend                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /kiro/v2/enhance-story
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Kiro API Server                            │
│                                                                   │
│  1. Load contract (enhance-story-v1)                             │
│  2. Validate input JSON against inputSchema                      │
│  3. Render transformation prompt                                 │
│  4. Send to Kiro CLI                                             │
│  5. Parse response JSON                                          │
│  6. Validate output JSON against outputSchema                    │
│  7. Return output JSON                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ stdin: prompt + input JSON
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Kiro CLI                                 │
│                                                                   │
│  1. Parse transformation prompt                                  │
│  2. Read input JSON                                              │
│  3. Apply transformation rules                                   │
│  4. Generate output JSON                                         │
│  5. Validate against output schema                               │
│  6. Return JSON via stdout                                       │
└─────────────────────────────────────────────────────────────────┘
```

### DynamoDB Schema Alignment

**Stories Table**:
```javascript
{
  TableName: "aipm-backend-prod-stories",
  KeySchema: [
    { AttributeName: "id", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" }
  ]
}
```

**Item Structure** (matches JSON contract):
```json
{
  "id": "story-123",
  "title": "...",
  "description": "...",
  "asA": "...",
  "iWant": "...",
  "soThat": "...",
  "storyPoint": 5,
  "parentId": "story-100",
  "components": ["Authentication"],
  "acceptanceCriteria": ["...", "..."],
  "enhanced": true,
  "enhancedAt": "2025-12-17T22:31:00.000Z",
  "createdAt": "2025-12-17T10:00:00.000Z",
  "updatedAt": "2025-12-17T22:31:00.000Z"
}
```

**Acceptance Tests Table**:
```javascript
{
  TableName: "aipm-backend-prod-acceptance-tests",
  KeySchema: [
    { AttributeName: "id", KeyType: "HASH" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "storyId-index",
      KeySchema: [
        { AttributeName: "storyId", KeyType: "HASH" }
      ]
    }
  ]
}
```

**Item Structure** (matches JSON contract):
```json
{
  "id": "test-456",
  "storyId": "story-123",
  "ordinal": 1,
  "title": "...",
  "given": ["...", "..."],
  "when": ["...", "..."],
  "then": ["...", "..."],
  "status": "Draft",
  "createdAt": "2025-12-17T22:31:00.000Z",
  "updatedAt": "2025-12-17T22:31:00.000Z"
}
```

## Queue Handling

### Async Processing Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Request                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/stories/enhance
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda API Handler                          │
│                                                                   │
│  1. Generate taskId                                              │
│  2. Write task to DynamoDB queue table                           │
│  3. Return taskId immediately (202 Accepted)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Write to queue
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DynamoDB Queue Table                          │
│                                                                   │
│  {                                                               │
│    "taskId": "task-789",                                         │
│    "contractId": "enhance-story-v1",                             │
│    "status": "pending",                                          │
│    "inputJson": {...},                                           │
│    "outputJson": null,                                           │
│    "createdAt": "2025-12-17T22:31:00.000Z"                       │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Poll (every 1s)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Kiro Worker Process                         │
│                                                                   │
│  1. Scan for pending tasks                                       │
│  2. Pick oldest task                                             │
│  3. Update status to "processing"                                │
│  4. Send to Kiro API                                             │
│  5. Receive output JSON                                          │
│  6. Update task with output JSON                                 │
│  7. Update status to "completed"                                 │
│  8. Write output to target DynamoDB table                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Poll status (every 5s)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                                                                   │
│  GET /api/tasks/{taskId}                                         │
│  → { status: "completed", outputJson: {...} }                    │
│  → Update UI with enhanced story                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Table Schema

```json
{
  "TableName": "aipm-kiro-queue",
  "KeySchema": [
    { "AttributeName": "taskId", "KeyType": "HASH" }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "status-createdAt-index",
      "KeySchema": [
        { "AttributeName": "status", "KeyType": "HASH" },
        { "AttributeName": "createdAt", "KeyType": "RANGE" }
      ]
    }
  ]
}
```

**Queue Item**:
```json
{
  "taskId": "task-789",
  "contractId": "enhance-story-v1",
  "status": "pending|processing|completed|failed",
  "inputJson": {
    "storyId": "story-123",
    "title": "...",
    ...
  },
  "outputJson": {
    "storyId": "story-123",
    "title": "...",
    ...
  },
  "error": null,
  "createdAt": "2025-12-17T22:31:00.000Z",
  "startedAt": "2025-12-17T22:31:05.000Z",
  "completedAt": "2025-12-17T22:31:15.000Z",
  "duration": 10000
}
```

## Benefits of This Architecture

### 1. Clear Contract
- Input schema = What Kiro receives
- Output schema = What Kiro returns
- Transformation rules = How to convert
- No ambiguity

### 2. DynamoDB Alignment
- Input JSON = DynamoDB read format
- Output JSON = DynamoDB write format
- 1:1 field mapping
- No impedance mismatch

### 3. Predictable Behavior
- Same input JSON → Same transformation rules → Same output JSON
- Testable
- Reproducible
- Debuggable

### 4. Signal Propagation
```
DynamoDB → Input JSON → Kiro CLI → Output JSON → DynamoDB
```
- Clean data flow
- No data loss
- Traceable

### 5. Queue Handling
- Async processing
- Status tracking
- Error handling
- Retry logic

### 6. Extensibility
- Add new contract = Add new JSON file
- No code changes
- Version contracts independently
- Backward compatible

## Implementation Priority

1. **Define contracts** (JSON files)
2. **Update Kiro API** to use contracts
3. **Update prompts** to enforce JSON-to-JSON transformation
4. **Add queue table** to DynamoDB
5. **Implement worker** to process queue
6. **Update frontend** to poll task status

This architecture treats Kiro CLI as a **JSON transformation engine** with explicit contracts, not a conversational AI.
