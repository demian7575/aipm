# Kiro JSON Contract Architecture

## Core Principle

**JSON-to-JSON transformation with explicit contracts aligned 1:1 with DynamoDB schema.**

```
DynamoDB Item → Input JSON → Kiro CLI → Output JSON → DynamoDB Item
```

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              AIPM Frontend                                    │
│                                                                               │
│  User Action: "Enhance Story"                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ POST /api/stories/123/enhance
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Lambda API Handler                                   │
│                                                                               │
│  async function enhanceStory(storyId) {                                      │
│    // 1. Read from DynamoDB                                                  │
│    const story = await dynamodb.get({                                        │
│      TableName: 'aipm-backend-prod-stories',                                 │
│      Key: { id: storyId }                                                    │
│    });                                                                        │
│                                                                               │
│    // 2. Build input JSON (matches contract inputSchema)                     │
│    const inputJson = {                                                       │
│      storyId: story.id,                                                      │
│      title: story.title,                                                     │
│      description: story.description,                                         │
│      asA: story.asA,                                                         │
│      iWant: story.iWant,                                                     │
│      soThat: story.soThat,                                                   │
│      storyPoint: story.storyPoint,                                           │
│      parentId: story.parentId,                                               │
│      components: story.components                                            │
│    };                                                                         │
│                                                                               │
│    // 3. Create queue task                                                   │
│    const taskId = uuid();                                                    │
│    await dynamodb.put({                                                      │
│      TableName: 'aipm-kiro-queue',                                           │
│      Item: {                                                                 │
│        taskId,                                                               │
│        contractId: 'enhance-story-v1',                                       │
│        status: 'pending',                                                    │
│        inputJson,                                                            │
│        createdAt: new Date().toISOString()                                   │
│      }                                                                        │
│    });                                                                        │
│                                                                               │
│    // 4. Return task ID immediately (async processing)                       │
│    return { taskId, status: 'pending' };                                     │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Write to queue
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        DynamoDB: aipm-kiro-queue                              │
│                                                                               │
│  {                                                                            │
│    "taskId": "task-789",                                                     │
│    "contractId": "enhance-story-v1",                                         │
│    "status": "pending",                                                      │
│    "inputJson": {                                                            │
│      "storyId": "story-123",                                                 │
│      "title": "Implement login",                                             │
│      "description": "Add login page",                                        │
│      "asA": "user",                                                          │
│      "iWant": "to login",                                                    │
│      "soThat": "I can access the system",                                    │
│      "storyPoint": 5                                                         │
│    },                                                                         │
│    "outputJson": null,                                                       │
│    "createdAt": "2025-12-17T22:31:00.000Z"                                   │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Poll every 1s
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Kiro Worker Process                                  │
│                          (EC2 or Lambda)                                      │
│                                                                               │
│  while (true) {                                                              │
│    // 1. Scan for pending tasks                                              │
│    const tasks = await dynamodb.query({                                      │
│      TableName: 'aipm-kiro-queue',                                           │
│      IndexName: 'status-createdAt-index',                                    │
│      KeyConditionExpression: 'status = :pending',                            │
│      Limit: 1                                                                │
│    });                                                                        │
│                                                                               │
│    if (tasks.length === 0) {                                                 │
│      await sleep(1000);                                                      │
│      continue;                                                               │
│    }                                                                          │
│                                                                               │
│    const task = tasks[0];                                                    │
│                                                                               │
│    // 2. Update status to processing                                         │
│    await dynamodb.update({                                                   │
│      TableName: 'aipm-kiro-queue',                                           │
│      Key: { taskId: task.taskId },                                           │
│      UpdateExpression: 'SET status = :processing, startedAt = :now',        │
│      ExpressionAttributeValues: {                                            │
│        ':processing': 'processing',                                          │
│        ':now': new Date().toISOString()                                      │
│      }                                                                        │
│    });                                                                        │
│                                                                               │
│    // 3. Send to Kiro API                                                    │
│    const response = await fetch('http://localhost:8081/kiro/v2/transform', {│
│      method: 'POST',                                                         │
│      headers: { 'Content-Type': 'application/json' },                       │
│      body: JSON.stringify({                                                  │
│        contractId: task.contractId,                                          │
│        inputJson: task.inputJson                                             │
│      })                                                                       │
│    });                                                                        │
│                                                                               │
│    const outputJson = await response.json();                                 │
│                                                                               │
│    // 4. Update task with output                                             │
│    await dynamodb.update({                                                   │
│      TableName: 'aipm-kiro-queue',                                           │
│      Key: { taskId: task.taskId },                                           │
│      UpdateExpression: 'SET status = :completed, outputJson = :output, ...',│
│      ExpressionAttributeValues: {                                            │
│        ':completed': 'completed',                                            │
│        ':output': outputJson,                                                │
│        ':completedAt': new Date().toISOString()                              │
│      }                                                                        │
│    });                                                                        │
│                                                                               │
│    // 5. Write output to target table                                        │
│    await dynamodb.update({                                                   │
│      TableName: 'aipm-backend-prod-stories',                                 │
│      Key: { id: outputJson.storyId },                                        │
│      UpdateExpression: 'SET title = :title, description = :desc, ...',      │
│      ExpressionAttributeValues: {                                            │
│        ':title': outputJson.title,                                           │
│        ':desc': outputJson.description,                                      │
│        ':acceptanceCriteria': outputJson.acceptanceCriteria,                 │
│        ':enhanced': outputJson.enhanced,                                     │
│        ':enhancedAt': outputJson.enhancedAt,                                 │
│        ':updatedAt': new Date().toISOString()                                │
│      }                                                                        │
│    });                                                                        │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ POST /kiro/v2/transform
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Kiro API Server (V2)                                 │
│                                                                               │
│  async function transform(contractId, inputJson) {                           │
│    // 1. Load contract                                                       │
│    const contract = CONTRACTS[contractId];                                   │
│                                                                               │
│    // 2. Validate input JSON                                                 │
│    validateSchema(inputJson, contract.inputSchema);                          │
│                                                                               │
│    // 3. Build transformation prompt                                         │
│    const prompt = `                                                          │
│You are a JSON transformation service.                                        │
│                                                                               │
│INPUT JSON:                                                                    │
│${JSON.stringify(inputJson, null, 2)}                                         │
│                                                                               │
│TRANSFORMATION RULES:                                                         │
│${contract.transformationRules.map((r, i) => `${i+1}. ${r}`).join('\n')}     │
│                                                                               │
│OUTPUT SCHEMA:                                                                │
│${JSON.stringify(contract.outputSchema, null, 2)}                             │
│                                                                               │
│CRITICAL INSTRUCTIONS:                                                        │
│1. Return ONLY valid JSON matching the output schema exactly                  │
│2. No markdown code blocks (no \`\`\`json)                                    │
│3. No explanations, comments, or additional text                              │
│4. Start your response with { and end with }                                  │
│5. All required fields must be present                                        │
│6. Field types must match schema exactly                                      │
│7. Preserve IDs exactly as provided in input                                  │
│                                                                               │
│Return the transformed JSON now:                                              │
│`;                                                                             │
│                                                                               │
│    // 4. Send to Kiro CLI                                                    │
│    const result = await kiroQueue.sendCommand(prompt);                       │
│                                                                               │
│    // 5. Parse response                                                      │
│    const outputJson = parseJsonResponse(result.output);                      │
│                                                                               │
│    // 6. Validate output JSON                                                │
│    validateSchema(outputJson, contract.outputSchema);                        │
│                                                                               │
│    // 7. Return output JSON                                                  │
│    return outputJson;                                                        │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ stdin: prompt
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Kiro CLI Process                                     │
│                                                                               │
│  1. Receive transformation prompt via stdin                                  │
│  2. Parse input JSON from prompt                                             │
│  3. Understand transformation rules                                          │
│  4. Apply rules to generate output JSON                                      │
│  5. Validate output against schema                                           │
│  6. Return JSON via stdout                                                   │
│                                                                               │
│  Output:                                                                     │
│  {                                                                            │
│    "storyId": "story-123",                                                   │
│    "title": "Implement secure email/password authentication",               │
│    "description": "Create login page with form validation...",              │
│    "asA": "registered user with valid credentials",                          │
│    "iWant": "to securely authenticate using my email and password",          │
│    "soThat": "I can access my personalized dashboard",                       │
│    "storyPoint": 5,                                                          │
│    "acceptanceCriteria": [                                                   │
│      "Login form validates email format",                                    │
│      "Password is masked during input",                                      │
│      "Invalid credentials show error message",                               │
│      "Successful login redirects to dashboard",                              │
│      "Account locks after 5 failed attempts"                                 │
│    ],                                                                         │
│    "enhanced": true,                                                         │
│    "enhancedAt": "2025-12-17T22:31:15.000Z"                                  │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ stdout: JSON
                                    ▼
                            (Back to Kiro API Server)
                                    │
                                    │ Return output JSON
                                    ▼
                            (Back to Kiro Worker)
                                    │
                                    │ Write to DynamoDB
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   DynamoDB: aipm-backend-prod-stories                         │
│                                                                               │
│  {                                                                            │
│    "id": "story-123",                                                        │
│    "title": "Implement secure email/password authentication",               │
│    "description": "Create login page with form validation...",              │
│    "asA": "registered user with valid credentials",                          │
│    "iWant": "to securely authenticate using my email and password",          │
│    "soThat": "I can access my personalized dashboard",                       │
│    "storyPoint": 5,                                                          │
│    "acceptanceCriteria": [                                                   │
│      "Login form validates email format",                                    │
│      "Password is masked during input",                                      │
│      "Invalid credentials show error message",                               │
│      "Successful login redirects to dashboard",                              │
│      "Account locks after 5 failed attempts"                                 │
│    ],                                                                         │
│    "enhanced": true,                                                         │
│    "enhancedAt": "2025-12-17T22:31:15.000Z",                                 │
│    "updatedAt": "2025-12-17T22:31:15.000Z"                                   │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Frontend polls: GET /api/tasks/task-789
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              AIPM Frontend                                    │
│                                                                               │
│  // Poll task status every 5 seconds                                         │
│  const task = await fetch('/api/tasks/task-789');                            │
│  if (task.status === 'completed') {                                          │
│    // Update UI with enhanced story                                          │
│    displayEnhancedStory(task.outputJson);                                    │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Key Benefits

### 1. Clear Contract
- **Input schema** defines what goes in
- **Output schema** defines what comes out
- **Transformation rules** define how to convert
- **No ambiguity**, fully documented

### 2. DynamoDB 1:1 Alignment
```javascript
// Input JSON = DynamoDB read
const inputJson = {
  storyId: dynamoItem.id,
  title: dynamoItem.title,
  ...
};

// Output JSON = DynamoDB write
await dynamodb.update({
  Key: { id: outputJson.storyId },
  UpdateExpression: 'SET title = :title, ...',
  ExpressionAttributeValues: {
    ':title': outputJson.title,
    ...
  }
});
```

### 3. Predictable Signal Propagation
```
DynamoDB → Input JSON → Kiro CLI → Output JSON → DynamoDB
```
- Every field is traced
- No data loss
- Auditable

### 4. Queue-Based Async Processing
- Frontend gets immediate response (202 Accepted)
- Worker processes in background
- Frontend polls for completion
- Scales independently

### 5. Testable
```javascript
// Test contract
const inputJson = { storyId: "test-1", title: "Test", ... };
const outputJson = await transform("enhance-story-v1", inputJson);

assert(outputJson.storyId === "test-1"); // ID preserved
assert(outputJson.title !== "Test"); // Title enhanced
assert(outputJson.acceptanceCriteria.length >= 3); // Criteria generated
assert(outputJson.enhanced === true); // Flag set
```

### 6. Extensible
```json
// Add new contract = add new JSON file
{
  "split-story-v1": {
    "inputSchema": { ... },
    "outputSchema": { ... },
    "transformationRules": [ ... ]
  }
}
```

## Implementation Checklist

- [ ] Create contract definitions (`contracts/contracts.json`)
- [ ] Update Kiro API to load contracts
- [ ] Implement contract-based transformation
- [ ] Create DynamoDB queue table
- [ ] Implement worker process
- [ ] Add task status polling endpoint
- [ ] Update frontend to use async pattern
- [ ] Add contract validation tests
- [ ] Document each contract
- [ ] Monitor queue depth and processing time

This architecture treats Kiro CLI as a **JSON transformation engine** with explicit, versioned contracts that align 1:1 with the DynamoDB data model.
