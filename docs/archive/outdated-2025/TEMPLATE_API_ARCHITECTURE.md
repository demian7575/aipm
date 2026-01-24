# Template-Based API Architecture

## Overview
The AIPM system uses a **template-driven architecture** where API endpoints delegate AI tasks to Kiro CLI using Markdown templates. This creates a clean separation between HTTP handling and AI logic.

## Core Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (app.js)                              │
│  - User interactions (buttons, forms, modals)                           │
│  - HTTP requests to backend API                                         │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ HTTP POST
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Backend API (kiro-api-server-v4.js)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ HTTP Request Handler                                              │  │
│  │  - Parse request (URL, method, body)                              │  │
│  │  - Extract parameters (storyId, idea, etc.)                       │  │
│  │  - Build prompt with template reference                           │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                           │                                              │
│                           ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ sendToKiro(prompt)                                                │  │
│  │  - Writes prompt to stdin of Kiro CLI process                     │  │
│  │  - Returns immediately (non-blocking)                             │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                           │                                              │
│                           ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Wait Pattern (varies by endpoint)                                 │  │
│  │  - Polling: Check global.latestDraft every N seconds             │  │
│  │  - Timeout: Wait fixed time (20s) for response                    │  │
│  │  - Callback: Listen for /api/*-response POST                      │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                           │                                              │
│                           ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Response Handler                                                  │  │
│  │  - Read from global.latestDraft or direct result                  │  │
│  │  - Parse JSON response                                            │  │
│  │  - Store to DynamoDB (if needed)                                  │  │
│  │  - Return HTTP response to frontend                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ stdin write
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Kiro CLI Process (persistent)                        │
│  - Started at server boot: kiro-cli chat --trust-all-tools              │
│  - Reads prompts from stdin                                             │
│  - Executes AI reasoning and tool calls                                 │
│  - Outputs to stdout/stderr (captured by server)                        │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ reads template file
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Templates Directory (./templates/)                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Template Files (.md)                                            │   │
│  │  - Structured instructions for Kiro CLI                         │   │
│  │  - Input parameters (storyId, idea, etc.)                       │   │
│  │  - Expected output format (JSON schema)                         │   │
│  │  - Validation rules and constraints                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ Kiro executes template
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Kiro CLI Execution Flow                              │
│  1. Read template file from disk                                        │
│  2. Parse instructions and parameters                                   │
│  3. Execute AI reasoning (call LLM)                                     │
│  4. Format response as JSON                                             │
│  5. POST result back to API callback endpoint                           │
└────────────────┬────────────────────────────────────────────────────────┘
                 │ HTTP POST callback
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Backend Callback Endpoints (*-response)                    │
│  - /api/gwt-response      (GWT health analysis results)                 │
│  - /api/invest-response   (INVEST analysis results)                     │
│  - /api/draft-response    (User story draft results)                    │
│  - Store result in global.latestDraft or global.latestInvestResult      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Template-Based Endpoints

### 1. User Story Generation
**Endpoint:** `POST /api/generate-draft`
**Template:** `templates/user-story-generation.md`

```javascript
// Frontend Request
POST /api/generate-draft
{ feature_description: "user login system", parentId: 1000 }

// Backend builds prompt
const prompt = `Read and follow the template file: ./templates/user-story-generation.md

Feature description: "user login system"
Parent ID: 1000

Execute the template instructions exactly as written.`;

// Kiro CLI reads template, generates story
// Posts result to /api/draft-response
// Backend waits 20s, reads global.latestDraft
// Creates story in DynamoDB
// Returns { success: true, storyId: 123456789 }
```

**Flow:**
```
Frontend → POST /api/generate-draft
         → Backend: sendToKiro(prompt with template)
         → Kiro CLI: reads user-story-generation.md
         → Kiro CLI: generates story JSON
         → Kiro CLI: POST /api/draft-response
         → Backend: stores in global.latestDraft
         → Backend: creates story in DynamoDB
         → Backend: returns storyId to frontend
```

### 2. Acceptance Test Draft
**Endpoint:** `POST /api/stories/:storyId/tests/draft`
**Template:** `templates/acceptance-test-generation.md`

```javascript
// Frontend Request
POST /api/stories/101/tests/draft
{ idea: "test login with valid credentials" }

// Backend builds prompt
const prompt = `Read and follow the template file: ./templates/acceptance-test-generation.md

Story ID: 101
Idea: "test login with valid credentials"

Execute the template instructions exactly as written.`;

// Kiro CLI reads template, generates test
// Posts result to /api/draft-response
// Backend waits 20s, reads global.latestDraft
// Returns { given: [...], when: [...], then: [...] }
```

**Flow:**
```
Frontend → POST /api/stories/101/tests/draft
         → Backend: sendToKiro(prompt with template)
         → Kiro CLI: reads acceptance-test-generation.md
         → Kiro CLI: queries DynamoDB for story 101
         → Kiro CLI: generates GWT steps
         → Kiro CLI: POST /api/draft-response
         → Backend: stores in global.latestDraft
         → Backend: returns draft to frontend
         → Frontend: populates form fields
```

### 3. GWT Health Analysis
**Endpoint:** `POST /api/analyze-gwt`
**Template:** `templates/gwt-health-analysis.md`

```javascript
// Frontend Request
POST /api/analyze-gwt
{
  given: ["User is on login page"],
  when: ["User enters valid credentials", "User clicks login"],
  then: ["User sees dashboard"]
}

// Backend builds prompt
const prompt = `Read and follow the template file: ./templates/gwt-health-analysis.md

Given steps:
- User is on login page

When steps:
- User enters valid credentials
- User clicks login

Then steps:
- User sees dashboard

Execute the template instructions exactly as written.`;

// Kiro CLI reads template, analyzes GWT
// Posts result to /api/gwt-response
// Backend waits for callback
// Returns { verifiable: true, warnings: [] }
```

**Flow:**
```
Frontend → POST /api/analyze-gwt
         → Backend: sendToKiro(prompt with template)
         → Kiro CLI: reads gwt-health-analysis.md
         → Kiro CLI: analyzes GWT structure
         → Kiro CLI: POST /api/gwt-response
         → Backend: stores in global.latestGwtResult
         → Backend: returns analysis to frontend
         → Frontend: shows warnings or success
```

### 4. INVEST Analysis
**Endpoint:** `POST /api/analyze-invest`
**Template:** `templates/invest-analysis.md`

```javascript
// Frontend Request
POST /api/analyze-invest
{
  storyId: 101,
  asA: "developer",
  iWant: "to login",
  soThat: "I can access the system"
}

// Backend builds prompt
const prompt = `Read and follow the template file: ./templates/invest-analysis.md

Story ID: 101
As a: developer
I want: to login
So that: I can access the system

Execute the template instructions exactly as written.`;

// Kiro CLI reads template, analyzes INVEST
// Queries DynamoDB for acceptance tests
// Posts result to /api/invest-response
// Backend waits for callback
// Returns { warnings: [...], summary: "..." }
```

**Flow:**
```
Frontend → POST /api/analyze-invest
         → Backend: sendToKiro(prompt with template)
         → Kiro CLI: reads invest-analysis.md
         → Kiro CLI: queries DynamoDB for tests
         → Kiro CLI: analyzes INVEST criteria
         → Kiro CLI: POST /api/invest-response
         → Backend: stores in global.latestInvestResult
         → Backend: saves to DynamoDB story.investAnalysis
         → Backend: returns analysis to frontend
         → Frontend: displays warnings in UI
```

### 5. Code Generation
**Endpoint:** `POST /api/create-pr`
**Template:** `templates/code-generation.md`

```javascript
// Frontend Request
POST /api/create-pr
{ storyId: 101 }

// Backend creates PR branch
// Creates TASK.md in PR
// Adds task to DynamoDB queue
// Kiro worker picks up task

// Worker builds prompt
const prompt = `Read and follow the template file: ./templates/code-generation.md

Story ID: 101

Execute the template instructions exactly as written.`;

// Kiro CLI reads template, generates code
// Commits and pushes to PR branch
// Updates task status in DynamoDB
```

**Flow:**
```
Frontend → POST /api/create-pr
         → Backend: creates PR branch on GitHub
         → Backend: creates TASK.md in PR
         → Backend: adds task to aipm-amazon-q-queue
         → Kiro Worker: polls queue
         → Kiro Worker: checks out PR branch
         → Kiro Worker: sendToKiro(prompt with template)
         → Kiro CLI: reads code-generation.md
         → Kiro CLI: reads TASK.md
         → Kiro CLI: generates code files
         → Kiro CLI: commits and pushes
         → Kiro Worker: updates task status
         → Frontend: polls task status
```

## Template Structure

All templates follow this pattern:

```markdown
# Template Name

## Context
[Description of what this template does]

## Input Parameters
- parameter1: description
- parameter2: description

## Instructions
1. Step-by-step instructions for Kiro CLI
2. Include tool calls (AWS CLI, file operations)
3. Specify validation rules

## Output Format
```json
{
  "field1": "value",
  "field2": ["array", "values"]
}
```

## Callback
POST the result to: /api/[endpoint]-response
```

## Communication Patterns

### Pattern 1: Timeout Wait (Draft Generation)
```javascript
// Backend
global.latestDraft = null;
await sendToKiro(prompt);
await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20s

if (global.latestDraft && (Date.now() - global.latestDraft.timestamp) < 30000) {
  const result = global.latestDraft.draft;
  global.latestDraft = null;
  return result;
}
```

### Pattern 2: Callback Wait (INVEST Analysis)
```javascript
// Backend endpoint
POST /api/analyze-invest → sendToKiro(prompt) → returns immediately

// Kiro CLI posts back
POST /api/invest-response → stores in global.latestInvestResult

// Backend health-check endpoint
GET /api/stories/:id/health-check → reads global.latestInvestResult
```

### Pattern 3: Queue-Based (Code Generation)
```javascript
// Backend
POST /api/create-pr → creates task in DynamoDB queue

// Kiro Worker (separate process)
while (true) {
  tasks = await queryQueue();
  for (task of tasks) {
    await sendToKiro(prompt);
    await updateTaskStatus(task.id, 'completed');
  }
  await sleep(1000);
}
```

## Data Flow

### Story Creation Flow
```
User clicks "Generate Story"
  ↓
Frontend: POST /api/generate-draft { feature_description, parentId }
  ↓
Backend: sendToKiro("Read template: user-story-generation.md...")
  ↓
Kiro CLI: reads template → queries DynamoDB → generates story JSON
  ↓
Kiro CLI: POST /api/draft-response { draft: {...} }
  ↓
Backend: global.latestDraft = { draft, timestamp }
  ↓
Backend: creates story in DynamoDB (PutCommand)
  ↓
Backend: creates acceptance tests in DynamoDB (PutCommand)
  ↓
Backend: returns { success: true, storyId: 123456789 }
  ↓
Frontend: refreshes story list, selects new story
```

### INVEST Analysis Flow
```
User edits story fields (asA, iWant, soThat)
  ↓
Frontend: POST /api/analyze-invest { storyId, asA, iWant, soThat }
  ↓
Backend: sendToKiro("Read template: invest-analysis.md...")
  ↓
Kiro CLI: reads template → queries acceptance tests → analyzes INVEST
  ↓
Kiro CLI: POST /api/invest-response { warnings: [...], summary: "..." }
  ↓
Backend: global.latestInvestResult = { warnings, summary, timestamp }
  ↓
Backend: updates story.investAnalysis in DynamoDB (UpdateCommand)
  ↓
Frontend: GET /api/stories/:id/health-check
  ↓
Backend: returns global.latestInvestResult
  ↓
Frontend: displays warnings in story details panel
```

## Key Design Principles

1. **Template as Source of Truth**: All AI logic lives in Markdown templates, not in code
2. **Separation of Concerns**: Backend handles HTTP/DB, Kiro CLI handles AI/reasoning
3. **Async Communication**: Backend doesn't block waiting for Kiro responses
4. **Global State for IPC**: Use global.latestDraft/latestInvestResult for process communication
5. **Idempotent Templates**: Templates can be re-run without side effects
6. **Explicit Callbacks**: Kiro CLI posts results back to specific endpoints
7. **Timeout Safety**: All waits have timeouts to prevent hanging

## Benefits

- **Maintainability**: Change AI logic by editing templates, not code
- **Testability**: Templates can be tested independently with Kiro CLI
- **Flexibility**: Add new endpoints by creating new templates
- **Debuggability**: Template execution is visible in Kiro CLI logs
- **Version Control**: Templates are versioned with code
- **No Vendor Lock-in**: Templates are plain Markdown, portable across AI systems

## File Locations

```
/repo/ebaejun/tools/aws/aipm/
├── scripts/
│   └── kiro-api-server-v4.js          # Backend API server
├── templates/
│   ├── user-story-generation.md       # Story creation
│   ├── acceptance-test-generation.md  # Test draft
│   ├── gwt-health-analysis.md         # GWT validation
│   ├── invest-analysis.md             # INVEST analysis
│   └── code-generation.md             # PR code generation
├── apps/frontend/public/
│   └── app.js                         # Frontend UI
└── scripts/workers/
    └── kiro-worker.sh                 # Queue processor
```

## Environment Setup

```bash
# Start API server (includes Kiro CLI process)
npm run dev

# Start Kiro worker (for code generation)
./scripts/workers/kiro-worker.sh
```

The API server automatically spawns Kiro CLI on startup:
```javascript
const kiroProcess = spawn('kiro-cli', ['chat', '--trust-all-tools'], {
  stdio: ['pipe', 'pipe', 'pipe']
});
```
