# Kiro API ↔ Kiro CLI Protocol Specification

## Overview

The Kiro API Server communicates with Kiro CLI through **stdin/stdout pipes** using a persistent process. The protocol is text-based with ANSI escape codes for terminal formatting.

## Communication Channel

```
┌─────────────────────────┐
│   Kiro API Server       │
│  (kiro-queue-manager)   │
└─────────────────────────┘
         │         ▲
         │ stdin   │ stdout
         │         │
         ▼         │
┌─────────────────────────┐
│   Kiro CLI Process      │
│   (persistent session)  │
└─────────────────────────┘
```

**Transport**: Node.js `child_process.spawn()` with `stdio: ['pipe', 'pipe', 'pipe']`

## Signal Structure

### 1. Request (Kiro API → Kiro CLI)

**Channel**: stdin  
**Format**: Plain text with newline terminator

```
<prompt_text>\n
```

**Example**:
```
Enhance this user story:

Original Idea: User login feature

Current Draft:
- Title: Implement login
- Description: Add login page
- As a: user
- I want: to login
- So that: I can access the system
- Story Points: 5

Please provide an enhanced version in JSON format.
\n
```

**Characteristics**:
- UTF-8 encoded text
- Single newline (`\n`) terminates the message
- No special framing or headers
- Prompt can be multi-line
- No length limit (practical limit: ~10KB)

### 2. Response (Kiro CLI → Kiro API)

**Channel**: stdout  
**Format**: ANSI-formatted text with completion marker

```
<ansi_codes><response_text><ansi_codes><completion_marker>
```

**Example Raw Output**:
```
\x1b[0m\x1b[2K\x1b[1G{
  "title": "Implement secure user authentication",
  "description": "Create login page with validation",
  "asA": "registered user",
  "iWant": "to securely authenticate",
  "soThat": "I can access protected features"
}
\x1b[38;5;141m> \x1b[0m
```

**Completion Marker**:
```
\x1b[38;5;141m> \x1b[0m
```

This is Kiro's purple prompt: `> ` (with ANSI color code 141)

### 3. Response Parsing

**Step 1: Accumulate Buffer**
```javascript
this.kiroProcess.stdout.on('data', (data) => {
  this.buffer += data.toString();
  this.checkForResponse();
});
```

**Step 2: Detect Completion**
```javascript
const hasPromptMarker = this.buffer.includes('\x1b[38;5;141m> \x1b[0m');
```

**Step 3: Wait for Complete Response**
```javascript
// Wait 500ms after prompt marker to ensure full response
setTimeout(() => {
  // Process buffer
}, 500);
```

**Step 4: Clean ANSI Codes**
```javascript
const cleanBuffer = this.buffer.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '').trim();
```

**Step 5: Extract Response**
```javascript
let response = cleanBuffer
  .split('▸ Time:')[0]        // Remove timing info
  .split('To exit the CLI')[0] // Remove help text
  .replace(/^>\s*/, '')        // Remove prompt
  .trim();
```

## ANSI Escape Codes Reference

### Common Codes in Kiro Output

| Code | Meaning | Example |
|------|---------|---------|
| `\x1b[0m` | Reset all attributes | End of colored text |
| `\x1b[2K` | Clear entire line | Before writing new line |
| `\x1b[1G` | Move cursor to column 1 | Start of line |
| `\x1b[38;5;141m` | Set foreground color to purple (141) | Kiro prompt color |
| `\x1b[1m` | Bold text | Emphasis |
| `\x1b[32m` | Green text | Success messages |
| `\x1b[31m` | Red text | Error messages |
| `\x1b[33m` | Yellow text | Warnings |

### ANSI Code Structure

```
\x1b[<parameters>m
│   │ │          │
│   │ │          └─ 'm' = SGR (Select Graphic Rendition)
│   │ └─ Parameters (semicolon-separated)
│   └─ '[' = CSI (Control Sequence Introducer)
└─ ESC character (0x1B)
```

## Complete Request-Response Cycle

### Timeline

```
T+0ms    │ Kiro API: Write to stdin
         │ ─────────────────────────────────────────▶
         │ "Enhance this story...\n"
         │
T+10ms   │                                  Kiro CLI: Receive prompt
         │                                  Parse request
         │                                  Execute tools
         │                                  Generate response
         │
T+2000ms │                                  Kiro CLI: Write to stdout
         │ ◀─────────────────────────────────────────
         │ "\x1b[0m{...}\x1b[38;5;141m> \x1b[0m"
         │
T+2010ms │ Kiro API: Detect prompt marker
         │ Start 500ms wait timer
         │
T+2510ms │ Kiro API: Timer expires
         │ Clean ANSI codes
         │ Extract response
         │ Return to caller
```

### State Machine

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │
     │ sendCommand(message)
     │
     ▼
┌─────────────┐
│  SENDING    │ ─── stdin.write(message + '\n')
└─────┬───────┘
      │
      │ stdout.on('data')
      │
      ▼
┌─────────────────┐
│  ACCUMULATING   │ ─── buffer += data
└─────┬───────────┘
      │
      │ checkForResponse()
      │ hasPromptMarker?
      │
      ▼
┌─────────────────┐
│  WAITING        │ ─── setTimeout(500ms)
└─────┬───────────┘
      │
      │ Timer expires
      │
      ▼
┌─────────────────┐
│  PARSING        │ ─── Clean ANSI, extract response
└─────┬───────────┘
      │
      │ resolve(result)
      │
      ▼
┌─────────┐
│  IDLE   │
└─────────┘
```

## Error Conditions

### 1. Timeout (60 seconds)

**Trigger**: No prompt marker received within 60s

**Response**:
```javascript
{
  success: false,
  output: "<partial buffer content>",
  error: "Timeout after 60s"
}
```

### 2. Process Crash

**Trigger**: Kiro CLI process exits unexpectedly

**Handling**:
```javascript
this.kiroProcess.on('close', () => {
  console.log('Kiro process closed, restarting...');
  this.kiroProcess = null;
  setTimeout(() => this.start(), 1000);
});
```

**Impact**: Current request fails, queue continues after restart

### 3. Malformed Response

**Trigger**: Response is not valid JSON

**Handling**: Fallback to heuristic response
```javascript
try {
  const parsed = JSON.parse(result.output);
  return { ...parsed, source: 'kiro-enhanced' };
} catch (error) {
  return {
    // Fallback response
    enhanced: true,
    source: 'kiro-enhanced-fallback'
  };
}
```

## Timing Characteristics

| Event | Duration | Notes |
|-------|----------|-------|
| stdin write | <1ms | Synchronous write to pipe |
| Kiro processing | 2-30s | Depends on complexity |
| stdout data event | <1ms | Async event callback |
| Buffer accumulation | Variable | Multiple data events possible |
| Prompt marker detection | <1ms | String search |
| Wait after marker | 500ms | Ensure complete response |
| ANSI cleaning | <10ms | Regex replacement |
| Total latency | 2-30s | End-to-end |

## Buffer Management

### Accumulation Strategy

```javascript
// Initialize
this.buffer = '';

// Accumulate
this.kiroProcess.stdout.on('data', (data) => {
  this.buffer += data.toString();
  this.checkForResponse();
});

// Clear after processing
this.buffer = '';
```

### Why 500ms Wait?

Kiro CLI may emit the prompt marker before the full response is written due to:
- Buffering in Node.js streams
- Multiple `write()` calls from Kiro
- ANSI code sequences split across chunks

The 500ms wait ensures all data is received before parsing.

## Example: Complete Exchange

### Request
```
stdin ─▶ "Analyze this story against INVEST criteria:\n\nTitle: User login\nAs a: user\nI want: to login\nSo that: I can access the system\n\nReturn JSON with score and criteria.\n"
```

### Response (Raw)
```
stdout ◀─ "\x1b[0m\x1b[2K\x1b[1GHere's the INVEST analysis:\n\n```json\n{\n  \"score\": 75,\n  \"summary\": \"Story needs more specificity\",\n  \"criteria\": {\n    \"independent\": {\"pass\": true, \"feedback\": \"No dependencies\"},\n    \"negotiable\": {\"pass\": true, \"feedback\": \"Flexible implementation\"},\n    \"valuable\": {\"pass\": true, \"feedback\": \"Clear user value\"},\n    \"estimable\": {\"pass\": true, \"feedback\": \"Can be estimated\"},\n    \"small\": {\"pass\": false, \"feedback\": \"Too large\"},\n    \"testable\": {\"pass\": true, \"feedback\": \"Can be tested\"}\n  }\n}\n```\n\x1b[38;5;141m> \x1b[0m"
```

### Parsed Response
```javascript
{
  success: true,
  output: "Here's the INVEST analysis:\n\n```json\n{\n  \"score\": 75,\n  \"summary\": \"Story needs more specificity\",\n  \"criteria\": {\n    \"independent\": {\"pass\": true, \"feedback\": \"No dependencies\"},\n    \"negotiable\": {\"pass\": true, \"feedback\": \"Flexible implementation\"},\n    \"valuable\": {\"pass\": true, \"feedback\": \"Clear user value\"},\n    \"estimable\": {\"pass\": true, \"feedback\": \"Can be estimated\"},\n    \"small\": {\"pass\": false, \"feedback\": \"Too large\"},\n    \"testable\": {\"pass\": true, \"feedback\": \"Can be tested\"}\n  }\n}\n```",
  error: ""
}
```

### Extracted JSON
```javascript
// Further parsing to extract JSON from markdown code block
const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
const parsed = JSON.parse(jsonMatch[1]);
```

## Concurrency Model

### Single Persistent Session

```
Request 1 ──▶ [Process] ──▶ Response 1
                  │
Request 2 ──▶ [Queue] ──▶ [Process] ──▶ Response 2
                  │
Request 3 ──▶ [Queue] ──▶ [Queue] ──▶ [Process] ──▶ Response 3
```

**Why Single Session?**
- Maintains conversation context
- Kiro CLI remembers previous interactions
- Avoids startup overhead (2s per process)
- Simplifies state management

**Queue Behavior**:
- FIFO (First In, First Out)
- No priority
- No request cancellation
- Max queue size: Unlimited (memory bound)

## Debugging

### Enable Verbose Logging

```javascript
// In kiro-queue-manager.js
this.kiroProcess.stdout.on('data', (data) => {
  console.log('📥 Kiro stdout:', JSON.stringify(data.toString()));
  this.buffer += data.toString();
  this.checkForResponse();
});

this.kiroProcess.stderr.on('data', (data) => {
  console.error('📥 Kiro stderr:', data.toString());
});
```

### Inspect Buffer State

```javascript
checkForResponse() {
  console.log('🔍 Buffer length:', this.buffer.length);
  console.log('🔍 Has marker:', this.buffer.includes('\x1b[38;5;141m> \x1b[0m'));
  console.log('🔍 Buffer preview:', this.buffer.substring(0, 100));
  // ... rest of method
}
```

### Monitor Queue

```javascript
async sendCommand(message) {
  console.log('📊 Queue size:', this.queue.length);
  console.log('📊 Processing:', this.processing);
  // ... rest of method
}
```

## Performance Optimization

### Current Bottlenecks

1. **Sequential Processing**: Only 1 request at a time
2. **500ms Wait**: Adds latency to every response
3. **ANSI Parsing**: Regex on entire buffer

### Potential Improvements

1. **Multiple Sessions**: Spawn multiple Kiro CLI processes
   - Trade-off: Lose conversation context
   - Benefit: Higher throughput

2. **Streaming Parser**: Parse as data arrives
   - Trade-off: More complex state machine
   - Benefit: Reduce 500ms wait

3. **Binary Protocol**: Use structured format instead of text
   - Trade-off: Requires Kiro CLI changes
   - Benefit: Faster parsing, no ANSI cleanup

## Security Considerations

### Input Validation

Currently **no validation** on prompts sent to Kiro CLI.

**Risks**:
- Prompt injection
- Excessive resource usage
- Malicious tool execution

**Mitigations**:
- Kiro CLI runs in isolated environment
- File access limited to `/home/ec2-user/aipm`
- Network access controlled by security groups

### Output Sanitization

ANSI codes are stripped before returning to API clients.

**Why?**
- Prevent terminal injection attacks
- Ensure clean JSON parsing
- Consistent response format

## Testing

### Unit Test Example

```javascript
import KiroQueueManager from './kiro-queue-manager.js';

const queue = new KiroQueueManager();
await queue.start();

const result = await queue.sendCommand('What is 2+2?');
console.log(result);
// { success: true, output: "2+2 equals 4", error: "" }

await queue.stop();
```

### Integration Test

```bash
# Start Kiro API server
node scripts/kiro-api-server.js &

# Send test request
curl -X POST http://localhost:8081/kiro/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello Kiro"}'

# Expected response
# {"message": "Hello! How can I help you?", "success": true}
```

## Comparison: REST API vs Terminal WebSocket

| Aspect | REST API (Port 8081) | Terminal WebSocket (Port 8080) |
|--------|---------------------|-------------------------------|
| **Protocol** | HTTP + stdin/stdout | WebSocket + stdin/stdout |
| **Session** | Single persistent | One per connection |
| **Context** | Shared across requests | Isolated per session |
| **Concurrency** | Sequential (queue) | Multiple simultaneous |
| **Response** | Parsed JSON | Raw ANSI stream |
| **Use Case** | Automated tasks | Interactive chat |
| **Latency** | 2-30s | Real-time streaming |
