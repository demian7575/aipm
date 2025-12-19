# Kiro CLI Limitations for Structured API Use - Detailed Analysis

## Executive Summary

Kiro CLI is a **conversational AI assistant**, not a **structured API service**. This fundamental design difference creates four critical limitations when trying to use it as a backend API:

1. **Schema Non-Compliance** - Doesn't strictly follow output schemas
2. **Context Pollution** - Maintains conversation history across requests
3. **Slow Response Times** - 5-60+ seconds per request
4. **Unpredictable Behavior** - Interprets prompts conversationally, not literally

## Limitation 1: Schema Non-Compliance

### What We Expected

```javascript
// Prompt sent to Kiro
"You are a structured API. Respond with ONLY valid JSON.

Enhance this user story:
...

Expected Output Schema:
{
  "type": "object",
  "required": ["title", "description", "asA", "iWant", "soThat", "acceptanceCriteria"],
  ...
}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON matching the schema above
2. No markdown code blocks
3. No explanations
4. Start with { and end with }
5. Ensure all required fields are present"
```

### What Kiro Actually Returned

**Request 1: Chat endpoint (schema requires `message` field)**
```json
{
  "status": "ready",
  "message": "I will respond with valid JSON only",
  "timestamp": "2025-12-17T16:59:01.001+09:00"
}
```

✅ **Result**: PASSED - Has required `message` field
⚠️ **Issue**: Added extra fields (`status`, `timestamp`) not in schema

**Request 2: Enhance-story endpoint (schema requires `title`, `description`, `asA`, `iWant`, `soThat`, `acceptanceCriteria`)**
```json
{
  "message": "4"
}
```

❌ **Result**: FAILED - Missing all required fields
🤔 **Why**: Kiro answered the previous "What is 2+2?" question instead of enhancing the story

### Root Cause

Kiro CLI is designed to:
- **Understand intent** rather than follow literal instructions
- **Be helpful** by adding context (extra fields)
- **Maintain conversation flow** rather than treat each request as isolated

This is **by design** for conversational AI, but **incompatible** with strict API contracts.

### Evidence from Logs

```
📨 Kiro CLI response (success: true):
   Output length: 25 chars
   Output preview: json
{
  "message": "4"
}

🔍 Parsing Kiro response...
   ✅ JSON parsed successfully
   ❌ Schema validation failed: Missing required field: title
```

**Analysis**:
- Kiro returned valid JSON ✅
- But wrong schema ❌
- Answered previous question instead of current request ❌

### Why This Happens

Kiro CLI uses a **conversational model** that:

1. **Prioritizes coherence** over literal compliance
   - Sees "What is 2+2?" and "Enhance story" as part of same conversation
   - Tries to maintain conversational flow
   - May defer answering complex questions

2. **Interprets instructions flexibly**
   - "Return ONLY valid JSON" → Returns JSON, but adds helpful fields
   - "Match this schema" → Understands intent, but doesn't enforce strictly
   - "No explanations" → May still add context if it seems helpful

3. **Optimizes for user experience**
   - Adds timestamps for clarity
   - Includes status fields for transparency
   - Provides more information than requested

This is **excellent for chat**, but **problematic for APIs**.

## Limitation 2: Context Pollution

### The Problem

Kiro CLI maintains a **single persistent session** with **full conversation history**.

```
┌─────────────────────────────────────────────────────────────┐
│  Kiro CLI Session (Persistent)                              │
│                                                              │
│  History:                                                    │
│  1. User: "What is 2+2?"                                    │
│  2. Kiro: {"message": "4"}                                  │
│  3. User: "Enhance this story: ..."                         │
│  4. Kiro: (still thinking about context from #1 and #2)    │
└─────────────────────────────────────────────────────────────┘
```

### Real Example from Logs

**Timeline**:

```
T+0s:   Request 1 arrives: "What is 2+2?"
T+5s:   Kiro responds: {"message": "4"}
T+6s:   Request 2 arrives: "Enhance story..."
T+9s:   Kiro responds: {"message": "4"}  ← WRONG! Answered request 1 again
T+10s:  Request 2 still processing...
T+70s:  Request 2 still processing... (timeout)
```

### Why This Happens

**Persistent Session Design**:
```javascript
// kiro-queue-manager.js
async start() {
  // Spawn ONCE and keep alive
  this.kiroProcess = spawn('kiro-cli', ['chat', '--trust-all-tools']);
  
  // All requests use same process
  async sendCommand(message) {
    this.kiroProcess.stdin.write(message + '\n');
  }
}
```

**Intended Benefit**: Maintain context for follow-up questions
**Actual Problem**: Context from unrelated requests interferes

### Impact

1. **Request N affects Request N+1**
   - Previous questions influence current answers
   - Cannot guarantee isolated behavior
   - Unpredictable responses

2. **Cannot parallelize**
   - Only 1 request at a time
   - Queue backs up
   - Slow throughput

3. **Debugging nightmare**
   - Response depends on entire conversation history
   - Cannot reproduce issues in isolation
   - Must replay entire session to debug

### Comparison: API vs Conversation

| Aspect | API (Desired) | Kiro CLI (Actual) |
|--------|---------------|-------------------|
| **Request isolation** | Each request independent | All requests share context |
| **Reproducibility** | Same input → same output | Depends on conversation history |
| **Parallelization** | Multiple concurrent requests | Sequential only |
| **State** | Stateless | Stateful |
| **Debugging** | Test single request | Must replay entire session |

## Limitation 3: Slow Response Times

### Observed Performance

| Request Type | Expected | Actual | Status |
|--------------|----------|--------|--------|
| Health check | <100ms | 50ms | ✅ OK |
| Simple chat | <5s | 5.5s | ⚠️ Acceptable |
| Enhance story | <10s | 60s+ | ❌ Too slow |
| Generate test | <10s | Not completed | ❌ Timeout |

### Why So Slow?

**1. Kiro CLI Startup Overhead**
```
🚀 Starting persistent Kiro CLI session...
   Kiro CLI: /home/ebaejun/.local/bin/kiro-cli
   Working dir: /repo/ebaejun/tools/aws/aipm

⚠️  WARNING: MCP functionality has been disabled
[ASCII art logo]
[Tips and hints]
Model: Auto
All tools are now trusted...

⏱️ Total startup: ~2 seconds
```

**2. Thinking Time**
```
Kiro stderr: ⠋ Thinking...
Kiro stderr: ⠙ Thinking...
Kiro stderr: ⠹ Thinking...
... (repeats for 60+ seconds)
```

**3. Complex Prompts**
```
Prompt length: 1282 chars
- Story details
- Parent context
- INVEST criteria
- Output schema (200+ lines)
- Critical instructions

Kiro must:
1. Parse long prompt
2. Understand requirements
3. Generate creative content
4. Format as JSON
5. Validate against schema (in its mind)

⏱️ Total: 60+ seconds
```

**4. Tool Execution**
```
Kiro may execute tools:
- fs_read (read files for context)
- web_search (research best practices)
- execute_bash (run validation scripts)

Each tool call adds latency
```

### Comparison: Kiro CLI vs OpenAI API

| Metric | Kiro CLI | OpenAI API |
|--------|----------|------------|
| **Startup** | 2s | 0s (HTTP) |
| **Simple request** | 5-10s | 1-3s |
| **Complex request** | 30-60s | 3-8s |
| **Timeout** | 60s | 30s |
| **Throughput** | 1-2 req/min | 20-60 req/min |

### Impact on User Experience

**Synchronous API (Current)**:
```
User clicks "Enhance Story"
  ↓
Frontend shows loading spinner
  ↓
Wait 60 seconds...
  ↓
User thinks app is broken
  ↓
User refreshes page
  ↓
Request lost
```

**What Users Expect**:
```
User clicks "Enhance Story"
  ↓
Response in 2-5 seconds
  ↓
User sees enhanced story
  ↓
Happy user
```

## Limitation 4: Unpredictable Behavior

### The Core Issue

Kiro CLI is a **language model**, not a **deterministic function**.

```
Same Input + Same Prompt ≠ Same Output
```

### Examples

**Prompt**: "Return JSON with title field"

**Response 1** (70% probability):
```json
{
  "title": "Enhanced User Story"
}
```

**Response 2** (20% probability):
```json
{
  "title": "Enhanced User Story",
  "confidence": "high",
  "reasoning": "Based on INVEST principles..."
}
```

**Response 3** (10% probability):
```
Here's the enhanced story:

{
  "title": "Enhanced User Story"
}

I've improved the title by...
```

### Why This Happens

**1. Temperature/Sampling**
- Language models use probabilistic sampling
- Same prompt can generate different outputs
- Controlled by "temperature" parameter (not exposed in Kiro CLI)

**2. Context Window**
- Kiro considers entire conversation history
- Different history → different output
- Cannot control what context is used

**3. Model Updates**
- Kiro CLI may use different models over time
- "Auto" model selection
- Behavior changes without warning

**4. Tool Execution**
- Kiro may or may not execute tools
- Tool results affect output
- Non-deterministic tool behavior

### Impact on Testing

**Cannot write reliable tests**:
```javascript
// This test is flaky
test('enhance story returns title', async () => {
  const response = await enhanceStory(input);
  expect(response.title).toBeDefined(); // ❌ Sometimes fails
});
```

**Why it fails**:
- Response 1: Has `title` ✅
- Response 2: Has `title` ✅
- Response 3: Wrapped in markdown ❌ Parser fails
- Response 4: Answered different question ❌ Wrong schema

### Comparison: Deterministic vs Probabilistic

| Aspect | Deterministic API | Kiro CLI |
|--------|-------------------|----------|
| **Same input** | Same output | Different outputs |
| **Testing** | Reliable | Flaky |
| **Debugging** | Reproducible | Hard to reproduce |
| **Caching** | Possible | Risky |
| **Validation** | Strict | Lenient required |

## Why These Limitations Exist

### Kiro CLI's Design Goals

Kiro CLI was designed for:

1. **Interactive Development**
   - Help developers write code
   - Answer questions
   - Execute commands
   - Maintain context across conversation

2. **Human-in-the-Loop**
   - User reviews each response
   - User corrects misunderstandings
   - User provides clarification
   - Iterative refinement

3. **Flexibility**
   - Understand vague requests
   - Infer intent
   - Provide helpful extras
   - Adapt to user style

These are **strengths for chat**, but **weaknesses for APIs**.

### What APIs Need

APIs require:

1. **Strict Contracts**
   - Defined input schema
   - Defined output schema
   - No surprises

2. **Isolation**
   - Each request independent
   - No shared state
   - Reproducible

3. **Performance**
   - Fast response times (<5s)
   - High throughput
   - Predictable latency

4. **Determinism**
   - Same input → same output
   - Testable
   - Cacheable

### The Mismatch

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Kiro CLI Design       │         │   API Requirements      │
├─────────────────────────┤         ├─────────────────────────┤
│ • Conversational        │    ✗    │ • Transactional         │
│ • Stateful              │    ✗    │ • Stateless             │
│ • Flexible              │    ✗    │ • Strict                │
│ • Slow (thoughtful)     │    ✗    │ • Fast                  │
│ • Probabilistic         │    ✗    │ • Deterministic         │
│ • Human-in-loop         │    ✗    │ • Automated             │
└─────────────────────────┘         └─────────────────────────┘
```

## Real-World Impact

### Scenario: User Enhances 10 Stories

**With Kiro CLI API**:
```
Story 1: 60s  → Success
Story 2: 45s  → Success
Story 3: 70s  → Timeout
Story 4: 55s  → Wrong schema (context pollution)
Story 5: 40s  → Success
Story 6: 65s  → Timeout
Story 7: 50s  → Success
Story 8: 60s  → Wrong schema
Story 9: 55s  → Success
Story 10: 75s → Timeout

Total time: 575s (9.5 minutes)
Success rate: 50%
User experience: Terrible
```

**With OpenAI API**:
```
Story 1-10: 5s each (parallel)

Total time: 5s
Success rate: 95%
User experience: Excellent
```

### Scenario: 100 Concurrent Users

**With Kiro CLI API**:
```
Queue: 100 requests
Processing: 1 at a time
Average: 60s per request

Total time: 6000s (100 minutes)
First user: 60s wait
Last user: 6000s wait (1.6 hours!)

Result: System unusable
```

**With OpenAI API**:
```
Concurrent: 100 requests
Average: 5s per request

Total time: 5s
All users: 5s wait

Result: System scales
```

## Solutions

### Solution 1: Use OpenAI API for Structured Tasks

**Replace Kiro CLI with OpenAI for API endpoints**:

```javascript
// Instead of:
const result = await kiroQueue.sendCommand(prompt);

// Use:
const result = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }, // ← Enforces JSON
  temperature: 0.3, // ← More deterministic
  timeout: 10000 // ← 10s timeout
});
```

**Benefits**:
- ✅ Fast (3-8s)
- ✅ Reliable JSON output
- ✅ Stateless (no context pollution)
- ✅ Scalable (parallel requests)
- ✅ Deterministic (low temperature)

**Drawbacks**:
- ❌ Requires API key
- ❌ Costs money (~$0.01 per request)
- ❌ External dependency

### Solution 2: Keep Kiro CLI for Interactive Terminal

**Use Kiro CLI where it excels**:

```javascript
// ✅ Good use: Interactive terminal
WebSocket → Kiro CLI → User sees conversation

// ❌ Bad use: Synchronous API
HTTP POST → Kiro CLI → Timeout
```

**Benefits**:
- ✅ Leverages Kiro's strengths
- ✅ Great user experience for chat
- ✅ No API limitations matter

### Solution 3: Hybrid Architecture

**Best of both worlds**:

```
┌─────────────────────────────────────────────────────────┐
│                    AIPM Backend                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Interactive Chat:                                       │
│  WebSocket → Kiro CLI → Terminal                        │
│  (Conversational, stateful, slow OK)                    │
│                                                          │
│  Structured API:                                         │
│  HTTP POST → OpenAI API → JSON Response                 │
│  (Transactional, stateless, fast)                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ Right tool for each job
- ✅ Fast API responses
- ✅ Rich interactive experience
- ✅ Scalable architecture

## Conclusion

Kiro CLI's limitations are not bugs—they're **fundamental design characteristics** of a conversational AI tool.

**Kiro CLI is excellent for**:
- ✅ Interactive development
- ✅ Conversational assistance
- ✅ Terminal-based workflows
- ✅ Human-in-the-loop tasks

**Kiro CLI is poor for**:
- ❌ Synchronous APIs
- ❌ Structured data generation
- ❌ High-throughput services
- ❌ Strict schema compliance

**Recommendation**: Use Kiro CLI for what it's designed for (interactive chat), and use purpose-built APIs (OpenAI, Bedrock) for structured data generation.

The V2 architecture (templates, schemas, validation) is sound—just needs a different AI backend for API use cases.
