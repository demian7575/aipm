# Kiro REST API Architecture

## Full System Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AIPM Frontend (Browser)                                │
│                     http://aipm-static-hosting-demo.s3...                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/HTTPS
                                      │ REST API Calls
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AWS Lambda + API Gateway                                  │
│                  https://wk6h5fkqk9.execute-api.us-east-1...                    │
│                                                                                   │
│  Endpoints:                                                                       │
│  • POST /api/stories                    - Create/update stories                  │
│  • GET  /api/stories/:id                - Get story details                      │
│  • POST /api/acceptance-tests           - Create acceptance tests                │
│  • GET  /api/kiro-status/:requestId     - Poll Kiro task status                 │
│  • POST /api/codewhisperer-delegations  - Create code generation tasks          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ DynamoDB
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DynamoDB Tables                                      │
│                                                                                   │
│  • aipm-backend-prod-stories            - User stories                           │
│  • aipm-backend-prod-acceptance-tests   - Acceptance tests                       │
│  • aipm-amazon-q-queue                  - Code generation task queue             │
└─────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EC2 Instance (44.220.45.57)                              │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    Kiro API Server (Port 8081)                            │  │
│  │                   scripts/kiro-api-server.js                              │  │
│  │                                                                           │  │
│  │  HTTP Endpoints:                                                          │  │
│  │  • GET  /health                      - Health check                       │  │
│  │  • POST /kiro/enhance-story          - Enhance user story                 │  │
│  │  • POST /kiro/generate-acceptance-test - Generate acceptance test         │  │
│  │  • POST /kiro/analyze-invest         - INVEST analysis                    │  │
│  │  • POST /kiro/generate-code          - Code generation                    │  │
│  │  • POST /kiro/chat                   - Generic chat                       │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │           Kiro Queue Manager (kiro-queue-manager.js)                │ │  │
│  │  │                                                                     │ │  │
│  │  │  • Manages single persistent Kiro CLI session                      │ │  │
│  │  │  • Queues incoming requests (max concurrent: 1)                    │ │  │
│  │  │  • Handles stdin/stdout communication                              │ │  │
│  │  │  • Parses ANSI escape codes and prompt markers                     │ │  │
│  │  │  • 60-second timeout per request                                   │ │  │
│  │  │  • Auto-restart on process crash                                   │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                  │                                        │  │
│  │                                  │ spawn + stdio pipes                    │  │
│  │                                  ▼                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │              Kiro CLI Process (Persistent Session)                  │ │  │
│  │  │              /home/ec2-user/.local/bin/kiro-cli                     │ │  │
│  │  │                                                                     │ │  │
│  │  │  Command: kiro-cli chat --trust-all-tools                          │ │  │
│  │  │  Working Dir: /home/ec2-user/aipm                                  │ │  │
│  │  │                                                                     │ │  │
│  │  │  • Maintains conversation context                                  │ │  │
│  │  │  • Executes tool calls (fs_read, fs_write, execute_bash, etc.)    │ │  │
│  │  │  • Returns responses via stdout                                    │ │  │
│  │  │  • Prompt marker: \x1b[38;5;141m> \x1b[0m (purple "> ")           │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                Terminal WebSocket Server (Port 8080)                      │  │
│  │                   scripts/terminal-server.js                              │  │
│  │                                                                           │  │
│  │  WebSocket Endpoints:                                                     │  │
│  │  • WS  /terminal?branch=<branch>     - Interactive terminal session      │  │
│  │                                                                           │  │
│  │  HTTP Endpoints:                                                          │  │
│  │  • GET  /health                       - Health check                      │  │
│  │  • POST /checkout-branch              - Pre-checkout git branch           │  │
│  │                                                                           │  │
│  │  Features:                                                                │  │
│  │  • Spawns individual Kiro CLI per WebSocket connection                   │  │
│  │  • Bidirectional stdin/stdout streaming                                  │  │
│  │  • Binary data support (Blob/ArrayBuffer)                                │  │
│  │  • ANSI escape code passthrough                                          │  │
│  │  • Auto-cleanup on disconnect                                            │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Request Flow

### 1. Story Enhancement Flow

```
Frontend                    Lambda                  Kiro API Server         Kiro CLI
   │                          │                           │                    │
   │ User clicks "Enhance"    │                           │                    │
   │──────────────────────────▶                           │                    │
   │ POST /api/stories        │                           │                    │
   │ { idea, draft, parent }  │                           │                    │
   │                          │                           │                    │
   │                          │ Store in DynamoDB         │                    │
   │                          │ Generate requestId        │                    │
   │                          │                           │                    │
   │◀─────────────────────────│                           │                    │
   │ { requestId, status }    │                           │                    │
   │                          │                           │                    │
   │ Start polling            │                           │                    │
   │──────────────────────────▶                           │                    │
   │ GET /api/kiro-status/    │                           │                    │
   │     {requestId}          │                           │                    │
   │                          │                           │                    │
   │                          │ Check DynamoDB            │                    │
   │                          │ Status: "pending"         │                    │
   │                          │                           │                    │
   │◀─────────────────────────│                           │                    │
   │ { status: "pending" }    │                           │                    │
   │                          │                           │                    │
   │ (Meanwhile...)           │                           │                    │
   │                          │                           │                    │
   │                          │                           │ Queue picks task   │
   │                          │                           │────────────────────▶
   │                          │                           │ POST /kiro/        │
   │                          │                           │   enhance-story    │
   │                          │                           │                    │
   │                          │                           │ Add to queue       │
   │                          │                           │ (if processing)    │
   │                          │                           │                    │
   │                          │                           │ Send prompt via    │
   │                          │                           │ stdin              │
   │                          │                           │────────────────────▶
   │                          │                           │                    │
   │                          │                           │                    │ Process
   │                          │                           │                    │ Execute
   │                          │                           │                    │ tools
   │                          │                           │                    │
   │                          │                           │◀────────────────────
   │                          │                           │ Response via stdout│
   │                          │                           │ (wait for purple   │
   │                          │                           │  prompt marker)    │
   │                          │                           │                    │
   │                          │                           │ Parse JSON response│
   │                          │                           │                    │
   │                          │◀──────────────────────────│                    │
   │                          │ Update DynamoDB           │                    │
   │                          │ Status: "completed"       │                    │
   │                          │ Result: { enhanced data } │                    │
   │                          │                           │                    │
   │ Poll again (5s later)    │                           │                    │
   │──────────────────────────▶                           │                    │
   │ GET /api/kiro-status/    │                           │                    │
   │     {requestId}          │                           │                    │
   │                          │                           │                    │
   │                          │ Check DynamoDB            │                    │
   │                          │ Status: "completed"       │                    │
   │                          │                           │                    │
   │◀─────────────────────────│                           │                    │
   │ { status: "completed",   │                           │                    │
   │   result: {...} }        │                           │                    │
   │                          │                           │                    │
   │ Update UI with enhanced  │                           │                    │
   │ story data               │                           │                    │
```

### 2. Interactive Terminal Flow

```
Frontend                    Terminal Server              Kiro CLI
   │                              │                          │
   │ User clicks "Refine with     │                          │
   │ Kiro" button                 │                          │
   │                              │                          │
   │ Prepare context:             │                          │
   │ • Story title, description   │                          │
   │ • Acceptance tests           │                          │
   │ • Components                 │                          │
   │                              │                          │
   │ Open modal with xterm.js     │                          │
   │                              │                          │
   │ WebSocket connect            │                          │
   │──────────────────────────────▶                          │
   │ WS /terminal?branch=main     │                          │
   │                              │                          │
   │                              │ Spawn new Kiro CLI       │
   │                              │ process for this session │
   │                              │──────────────────────────▶
   │                              │ kiro-cli chat            │
   │                              │   --trust-all-tools      │
   │                              │                          │
   │◀──────────────────────────────                          │
   │ WS: "✓ Connected to Kiro CLI"│                          │
   │                              │                          │
   │ Display context in modal:    │                          │
   │ • Story summary              │                          │
   │ • Branch status              │                          │
   │                              │                          │
   │ User types message           │                          │
   │──────────────────────────────▶                          │
   │ WS: "Implement login feature"│                          │
   │                              │                          │
   │                              │ Write to stdin           │
   │                              │──────────────────────────▶
   │                              │                          │
   │                              │                          │ Process
   │                              │                          │ Execute
   │                              │                          │ tools
   │                              │                          │
   │                              │◀──────────────────────────
   │                              │ Read from stdout         │
   │                              │ (streaming)              │
   │                              │                          │
   │◀──────────────────────────────                          │
   │ WS: Kiro response chunks     │                          │
   │ (with ANSI colors)           │                          │
   │                              │                          │
   │ Render in xterm.js           │                          │
   │                              │                          │
   │ User continues conversation  │                          │
   │──────────────────────────────▶                          │
   │                              │──────────────────────────▶
   │                              │                          │
   │ Close modal                  │                          │
   │──────────────────────────────▶                          │
   │ WS: disconnect               │                          │
   │                              │                          │
   │                              │ Kill Kiro CLI process    │
   │                              │──────────────────────────▶
   │                              │                          │ Exit
```

## Protocol Details

### HTTP REST API (Kiro API Server)

**Base URL**: `http://44.220.45.57:8081`

#### Health Check
```http
GET /health
```

**Response**:
```json
{
  "status": "running",
  "service": "kiro-api-server",
  "port": 8081,
  "uptime": 12345.67,
  "activeRequests": 0,
  "queuedRequests": 2,
  "maxConcurrent": 1,
  "endpoints": [
    "POST /kiro/enhance-story",
    "POST /kiro/generate-acceptance-test",
    "POST /kiro/analyze-invest",
    "POST /kiro/generate-code",
    "POST /kiro/chat"
  ]
}
```

#### Enhance Story
```http
POST /kiro/enhance-story
Content-Type: application/json

{
  "idea": "User login feature",
  "draft": {
    "title": "Implement login",
    "description": "Add login page",
    "asA": "user",
    "iWant": "to login",
    "soThat": "I can access the system",
    "storyPoint": 5
  },
  "parent": {
    "title": "Authentication System"
  }
}
```

**Response**:
```json
{
  "title": "Implement secure user authentication with email/password",
  "description": "Create a login page with form validation...",
  "asA": "registered user",
  "iWant": "to securely authenticate using my email and password",
  "soThat": "I can access my personalized dashboard and protected features",
  "acceptanceCriteria": [
    "Login form validates email format",
    "Password is masked during input",
    "Invalid credentials show error message"
  ],
  "enhanced": true,
  "source": "kiro-enhanced"
}
```

#### Generate Acceptance Test
```http
POST /kiro/generate-acceptance-test
Content-Type: application/json

{
  "story": {
    "title": "User login",
    "description": "Implement login page",
    "asA": "user",
    "iWant": "to login",
    "soThat": "I can access the system"
  },
  "ordinal": 1,
  "reason": "Verify successful login",
  "idea": "Test with valid credentials"
}
```

**Response**:
```json
{
  "title": "Successful login with valid credentials",
  "given": [
    "User has registered account",
    "User is on login page"
  ],
  "when": [
    "User enters valid email",
    "User enters correct password",
    "User clicks login button"
  ],
  "then": [
    "User is redirected to dashboard",
    "Welcome message is displayed",
    "Session is created"
  ],
  "generated": true,
  "source": "kiro-generated"
}
```

#### INVEST Analysis
```http
POST /kiro/analyze-invest
Content-Type: application/json

{
  "title": "User login",
  "asA": "user",
  "iWant": "to login",
  "soThat": "I can access the system",
  "description": "Implement login page",
  "storyPoint": 5,
  "components": ["Authentication", "UI"]
}
```

**Response**:
```json
{
  "score": 85,
  "summary": "Story is well-defined with clear acceptance criteria",
  "warnings": [
    "Consider breaking down into smaller stories"
  ],
  "suggestions": [
    "Add specific security requirements",
    "Define error handling scenarios"
  ],
  "criteria": {
    "independent": {
      "pass": true,
      "feedback": "Can be developed without dependencies"
    },
    "negotiable": {
      "pass": true,
      "feedback": "Implementation details are flexible"
    },
    "valuable": {
      "pass": true,
      "feedback": "Provides clear user value"
    },
    "estimable": {
      "pass": true,
      "feedback": "Effort can be estimated"
    },
    "small": {
      "pass": false,
      "feedback": "May be too large for single sprint"
    },
    "testable": {
      "pass": true,
      "feedback": "Clear acceptance criteria defined"
    }
  },
  "analyzed": true,
  "source": "kiro-analysis"
}
```

#### Generic Chat
```http
POST /kiro/chat
Content-Type: application/json

{
  "prompt": "How do I implement JWT authentication in Node.js?"
}
```

**Response**:
```json
{
  "message": "To implement JWT authentication in Node.js...",
  "success": true
}
```

### WebSocket Protocol (Terminal Server)

**Base URL**: `ws://44.220.45.57:8080`

#### Connect
```
WS /terminal?branch=main
```

**Client → Server** (stdin):
```
"Implement login feature\n"
```

**Server → Client** (stdout):
```
"\x1b[38;5;141m> \x1b[0mI'll help you implement the login feature...\n"
```

**Data Format**:
- Text: UTF-8 strings
- Binary: Blob or ArrayBuffer (for ANSI escape codes)
- ANSI codes preserved for terminal rendering

## Context and Prompt Generation

### Story Enhancement Prompt Template

```
Enhance this user story:

Original Idea: {idea}

Current Draft:
- Title: {draft.title}
- Description: {draft.description}
- As a: {draft.asA}
- I want: {draft.iWant}
- So that: {draft.soThat}
- Story Points: {draft.storyPoint}

Parent Context: {parent ? parent.title : 'None'}

Please provide an enhanced version with:
1. Better, more specific title
2. Clearer description
3. More precise "I want" statement
4. Better "So that" with business value
5. Improved acceptance criteria

Return your response in JSON format:
{
  "title": "enhanced title",
  "description": "enhanced description",
  "asA": "enhanced persona",
  "iWant": "enhanced want statement",
  "soThat": "enhanced business value",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"]
}
```

### Terminal Context Injection

When opening Kiro terminal, frontend prepares context:

```javascript
function buildKiroContextSummary(story) {
  const parts = [];
  parts.push(`Story: ${story.title}`);
  
  if (story.description) {
    parts.push(`Description:\n${story.description}`);
  }
  
  const tests = story.acceptanceTests || [];
  if (tests.length) {
    parts.push(`Acceptance Tests:\n${tests.map(t => 
      `- ${t.title}\n  Given: ${t.given.join(', ')}\n  When: ${t.when.join(', ')}\n  Then: ${t.then.join(', ')}`
    ).join('\n')}`);
  }
  
  const components = story.components || [];
  if (components.length) {
    parts.push(`Components: ${components.join(', ')}`);
  }
  
  return parts.join('\n\n');
}
```

This context is displayed in the modal and available for user to reference when chatting with Kiro.

## Queue Management

### Kiro Queue Manager Behavior

- **Single Persistent Session**: One Kiro CLI process stays alive
- **Sequential Processing**: Max 1 concurrent request
- **Queue**: FIFO queue for pending requests
- **Timeout**: 60 seconds per request
- **Auto-restart**: Respawns Kiro CLI if process crashes
- **Response Detection**: Waits for purple prompt marker `\x1b[38;5;141m> \x1b[0m`
- **Buffer Management**: Accumulates stdout until prompt marker appears

### State Machine

```
[Idle] ──request──▶ [Processing] ──response──▶ [Idle]
   ▲                     │
   │                     │ timeout (60s)
   │                     ▼
   └────────────── [Error/Retry]
```

## Error Handling

### Timeout
```json
{
  "success": false,
  "output": "partial response...",
  "error": "Timeout after 60s"
}
```

### Process Crash
- Queue manager detects process exit
- Logs error
- Waits 1 second
- Spawns new Kiro CLI process
- Continues processing queue

### Parse Error
- Falls back to heuristic response
- Marks as `source: "kiro-fallback"`
- Returns basic structure

## Performance Characteristics

- **Latency**: 2-30 seconds per request (depends on Kiro processing)
- **Throughput**: ~2-30 requests/minute (sequential processing)
- **Concurrency**: 1 (by design, to maintain conversation context)
- **Memory**: ~200MB per Kiro CLI process
- **Startup Time**: ~2 seconds for Kiro CLI initialization

## Security Considerations

- **CORS**: Enabled for all origins (`Access-Control-Allow-Origin: *`)
- **Authentication**: None (internal EC2 service)
- **Network**: EC2 security group restricts access
- **File Access**: Kiro CLI has full filesystem access to `/home/ec2-user/aipm`
- **Command Execution**: Kiro CLI can execute arbitrary bash commands via tools

## Monitoring

### Health Checks

**Kiro API Server**:
```bash
curl http://44.220.45.57:8081/health
```

**Terminal Server**:
```bash
curl http://44.220.45.57:8080/health
```

### Logs

**Kiro API Server**:
```bash
journalctl -u kiro-api -f
```

**Terminal Server**:
```bash
journalctl -u terminal-server -f
```

### Diagnostics Script

```bash
./scripts/utilities/kiro-service-health.sh
```

Checks:
- Process status
- Port availability
- HTTP health endpoints
- Recent logs
- Resource usage
