# AIPM Web UI + MCP Server Integration Workflow

## Architecture: AIPM UI as Frontend for MCP Server

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                       │
│                     http://aipm-static-hosting-demo                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ HTTP (User Actions)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AIPM WEB FRONTEND (S3)                                 │
│                      apps/frontend/public/app.js                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ UI Components                                                         │ │
│  │  - Mindmap (story visualization)                                      │ │
│  │  - Outline (hierarchical tree)                                        │ │
│  │  - Details Panel (story editor)                                       │ │
│  │  - Modals (create/edit forms)                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ API Client Layer                                                      │ │
│  │  - fetch() calls to backend                                           │ │
│  │  - JSON request/response handling                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ HTTP REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AIPM BACKEND API (EC2:8081)                              │
│                    scripts/kiro-api-server-v4.js                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ HTTP Endpoints                                                        │ │
│  │  GET  /api/stories                                                    │ │
│  │  POST /api/stories                                                    │ │
│  │  GET  /api/stories/:id                                                │ │
│  │  POST /api/stories/:id/tests                                          │ │
│  │  ... (30+ endpoints)                                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ NEW: MCP Client Integration                                           │ │
│  │  - Connect to AIPM MCP Server                                         │ │
│  │  - Use MCP tools for operations                                       │ │
│  │  - Fallback to direct DynamoDB                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   Direct DynamoDB Access     │  │   MCP Server (Optional)      │
│   (Current Implementation)   │  │   (Enhanced Capabilities)    │
│                              │  │                              │
│  - AWS SDK calls             │  │  - AI-powered operations     │
│  - CRUD operations           │  │  - Smart queries             │
│  - Fast & direct             │  │  - Natural language          │
└──────────────────────────────┘  └──────────────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS DYNAMODB                                       │
│  - aipm-backend-prod-stories                                                │
│  - aipm-backend-prod-acceptance-tests                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflow 1: User Creates Story via AIPM UI

### Current Flow (Direct DynamoDB)
```
User clicks "Create Story" button
    ↓
AIPM Frontend (app.js)
    ↓ Fill form: title, asA, iWant, soThat
User clicks "Create"
    ↓
Frontend: POST /api/stories
    {
      title: "User Login",
      asA: "user",
      iWant: "to log in",
      soThat: "I can access my account"
    }
    ↓
Backend API (kiro-api-server-v4.js)
    ↓ Generate ID, validate data
DynamoDB PutCommand
    ↓ Insert story
Backend returns: { id: 123, title: "User Login", ... }
    ↓
Frontend receives response
    ↓ Update UI
Mindmap & Outline refresh
    ↓
User sees new story in tree
```

### Enhanced Flow (With MCP Server)
```
User clicks "Create Story" button
    ↓
AIPM Frontend (app.js)
    ↓ Fill form: title, asA, iWant, soThat
User clicks "Create"
    ↓
Frontend: POST /api/stories
    {
      title: "User Login",
      asA: "user",
      iWant: "to log in",
      soThat: "I can access my account"
    }
    ↓
Backend API (kiro-api-server-v4.js)
    ↓ Route to MCP-enhanced handler
MCP Client calls: create_story tool
    ↓
AIPM MCP Server
    ↓ AI validates story quality
    ↓ Checks INVEST criteria
    ↓ Suggests improvements
DynamoDB PutCommand (via MCP)
    ↓ Insert story with AI metadata
Backend returns: {
      id: 123,
      title: "User Login",
      investAnalysis: { warnings: [...], suggestions: [...] },
      aiGenerated: false
    }
    ↓
Frontend receives enhanced response
    ↓ Update UI with AI insights
Mindmap shows story with quality indicators
    ↓
User sees new story + AI suggestions
```

## Workflow 2: User Views Story Details

### Current Flow
```
User clicks story in mindmap/outline
    ↓
Frontend: GET /api/stories/123
    ↓
Backend API
    ↓ GetCommand (story)
    ↓ QueryCommand (acceptance tests)
DynamoDB returns data
    ↓
Backend merges story + tests
    ↓
Frontend receives: {
      id: 123,
      title: "User Login",
      acceptanceTests: [...]
    }
    ↓
Details panel displays:
    - Story fields
    - Acceptance tests table
    - INVEST warnings
```

### Enhanced Flow (With MCP)
```
User clicks story in mindmap/outline
    ↓
Frontend: GET /api/stories/123
    ↓
Backend API
    ↓ MCP Client calls: get_story tool
AIPM MCP Server
    ↓ Fetch story + tests
    ↓ AI analyzes completeness
    ↓ Generates insights
DynamoDB returns data
    ↓
MCP Server enriches with:
    - Related stories (AI-suggested)
    - Missing acceptance tests (AI-detected)
    - Component recommendations
    - Story point estimation
    ↓
Backend returns enhanced data: {
      id: 123,
      title: "User Login",
      acceptanceTests: [...],
      aiInsights: {
        relatedStories: [124, 125],
        missingTests: ["error handling", "timeout"],
        suggestedComponents: ["System", "Security"],
        estimatedPoints: 5
      }
    }
    ↓
Details panel displays:
    - Story fields
    - Acceptance tests
    - AI insights panel (NEW)
    - Related stories links (NEW)
    - Suggestions (NEW)
```

## Workflow 3: User Generates Acceptance Test

### Current Flow
```
User clicks "Create Acceptance Test"
    ↓
Modal opens with empty form
    ↓
User clicks "Generate Draft"
    ↓
Frontend: POST /api/stories/123/tests/draft
    ↓
Backend API
    ↓ sendToKiro(template prompt)
Kiro CLI reads template
    ↓ Generates GWT steps
    ↓ POST /api/draft-response
Backend receives draft
    ↓
Frontend receives: {
      given: ["User is on login page"],
      when: ["User enters credentials"],
      then: ["User sees dashboard"]
    }
    ↓
Modal populates form fields
    ↓
User reviews and clicks "Create Test"
    ↓
Frontend: POST /api/stories/123/tests
    ↓
Backend: DynamoDB PutCommand
    ↓
Test created
```

### Enhanced Flow (With MCP)
```
User clicks "Create Acceptance Test"
    ↓
Modal opens
    ↓
User clicks "Generate Draft" (or types idea)
    ↓
Frontend: POST /api/stories/123/tests/draft
    { idea: "test login with valid credentials" }
    ↓
Backend API
    ↓ MCP Client calls: create_acceptance_test tool
AIPM MCP Server
    ↓ AI analyzes story context
    ↓ Generates comprehensive GWT
    ↓ Validates against best practices
    ↓ Suggests edge cases
    ↓
Frontend receives: {
      given: ["User is on login page", "User has valid account"],
      when: ["User enters valid credentials", "User clicks login"],
      then: ["User sees dashboard", "Session is created"],
      aiSuggestions: {
        edgeCases: ["invalid password", "account locked", "network timeout"],
        coverage: 75,
        improvements: ["Add negative test cases"]
      }
    }
    ↓
Modal shows:
    - Generated GWT steps
    - AI suggestions panel (NEW)
    - Coverage indicator (NEW)
    - Edge case recommendations (NEW)
    ↓
User reviews, adds edge cases, clicks "Create Test"
    ↓
Frontend: POST /api/stories/123/tests (with all tests)
    ↓
Backend: DynamoDB PutCommand (batch)
    ↓
Multiple tests created
```

## Workflow 4: User Queries Stories

### Current Flow
```
User types in search box: "login"
    ↓
Frontend: GET /api/stories
    ↓
Backend: DynamoDB Scan
    ↓
Frontend filters locally by title
    ↓
Display matching stories
```

### Enhanced Flow (With MCP)
```
User types natural language: "show me all authentication stories"
    ↓
Frontend: POST /api/stories/search
    { query: "show me all authentication stories" }
    ↓
Backend API
    ↓ MCP Client calls: query_stories tool
AIPM MCP Server
    ↓ AI interprets natural language
    ↓ Understands "authentication" = login, auth, security
    ↓ Queries by multiple criteria
DynamoDB Query/Scan with smart filters
    ↓
MCP Server ranks results by relevance
    ↓
Frontend receives: {
      stories: [...],
      interpretation: "Found stories related to authentication, login, and security",
      filters: ["component:Security", "keyword:login"],
      suggestions: ["Also try: 'password reset', 'two-factor auth'"]
    }
    ↓
Display:
    - Ranked results
    - Query interpretation (NEW)
    - Related searches (NEW)
```

## Workflow 5: Bulk Operations

### New Capability (MCP-Powered)
```
User selects multiple stories in UI
    ↓
User clicks "Analyze Selected"
    ↓
Frontend: POST /api/stories/bulk-analyze
    { storyIds: [101, 102, 103, 104, 105] }
    ↓
Backend API
    ↓ MCP Client calls multiple tools
AIPM MCP Server
    ↓ For each story:
      - get_story
      - analyze INVEST
      - check test coverage
      - find dependencies
    ↓ AI generates report
    ↓
Frontend receives: {
      summary: {
        totalStories: 5,
        avgStoryPoints: 4.2,
        testCoverage: 80%,
        investIssues: 2
      },
      stories: [
        {
          id: 101,
          issues: ["No acceptance tests"],
          suggestions: ["Add error handling test"]
        },
        ...
      ],
      recommendations: [
        "Story 103 should be split (too large)",
        "Stories 101 and 104 have circular dependency"
      ]
    }
    ↓
Display bulk analysis report:
    - Summary dashboard
    - Per-story issues
    - Cross-story insights (NEW)
    - Action recommendations (NEW)
```

## Integration Points

### Backend API Enhancement

Add MCP client to existing backend:

```javascript
// scripts/kiro-api-server-v4.js

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

// Initialize MCP client
let mcpClient = null;

async function initMCPClient() {
  const serverProcess = spawn('node', [
    './mcp-server/aipm-server.js'
  ]);
  
  const transport = new StdioClientTransport({
    command: serverProcess
  });
  
  mcpClient = new Client({
    name: 'aipm-backend',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  await mcpClient.connect(transport);
  console.log('✅ MCP client connected');
}

// Enhanced endpoint
if (url.pathname === '/api/stories' && req.method === 'POST') {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    const payload = JSON.parse(body);
    
    // Option 1: Use MCP for AI-enhanced creation
    if (mcpClient && payload.useAI) {
      const result = await mcpClient.request({
        method: 'tools/call',
        params: {
          name: 'create_story',
          arguments: payload
        }
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(result.content[0].text);
      return;
    }
    
    // Option 2: Direct DynamoDB (current implementation)
    const storyId = Date.now();
    await dynamodb.send(new PutCommand({
      TableName: STORIES_TABLE,
      Item: { id: storyId, ...payload }
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: storyId, ...payload }));
  });
  return;
}
```

### Frontend Enhancement

Add AI toggle in UI:

```javascript
// apps/frontend/public/app.js

// Add AI toggle to create story modal
const aiToggle = document.createElement('label');
aiToggle.innerHTML = `
  <input type="checkbox" id="use-ai-enhancement" checked>
  Use AI Enhancement (INVEST analysis, suggestions)
`;
container.appendChild(aiToggle);

// When creating story
async function createStory(storyData) {
  const useAI = document.getElementById('use-ai-enhancement').checked;
  
  const response = await fetch('/api/stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...storyData,
      useAI: useAI
    })
  });
  
  const result = await response.json();
  
  // Display AI insights if available
  if (result.aiInsights) {
    showAIInsightsPanel(result.aiInsights);
  }
  
  return result;
}
```

## Benefits of MCP Integration

### For Users
- **Natural language queries** - "show me incomplete stories"
- **AI suggestions** - Automatic test generation, story improvements
- **Smart validation** - Real-time INVEST analysis
- **Better insights** - Related stories, dependencies, coverage

### For Developers
- **Unified interface** - Same tools for UI and CLI
- **Extensible** - Add new AI capabilities without changing UI
- **Testable** - MCP tools can be tested independently
- **Maintainable** - Separate concerns (UI vs AI logic)

### For Operations
- **Consistent data** - Single source of truth (DynamoDB)
- **Flexible deployment** - MCP server optional
- **Gradual adoption** - Enable AI features per-user
- **Monitoring** - Track AI usage and effectiveness

## Migration Path

### Phase 1: Parallel Operation (Current)
- AIPM UI → Backend API → DynamoDB (existing)
- MCP Server available for CLI/external tools

### Phase 2: Optional AI Enhancement
- AIPM UI → Backend API → MCP Client (optional) → DynamoDB
- Users can toggle AI features on/off
- Fallback to direct DynamoDB if MCP unavailable

### Phase 3: Full Integration
- AIPM UI → Backend API → MCP Client (default) → DynamoDB
- All operations use MCP for consistency
- Direct DynamoDB only for performance-critical paths

## Configuration

Enable MCP in backend:

```javascript
// config.js
export const CONFIG = {
  MCP_ENABLED: process.env.MCP_ENABLED === 'true',
  MCP_SERVER_PATH: './mcp-server/aipm-server.js',
  FALLBACK_TO_DIRECT: true
};
```

User preference in frontend:

```javascript
// localStorage
localStorage.setItem('aipm.useAI', 'true');
```

## Performance Considerations

**Direct DynamoDB:**
- Faster (50-100ms)
- No AI overhead
- Simple CRUD

**Via MCP Server:**
- Slower (200-500ms)
- AI analysis included
- Enhanced features

**Hybrid Approach:**
- Read operations: Direct (fast)
- Write operations: MCP (validated)
- Queries: MCP (smart)
- Bulk operations: MCP (insights)
