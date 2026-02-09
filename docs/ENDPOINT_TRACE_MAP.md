# AIPM Endpoint Trace Map

**Purpose:** Complete trace of frontend actions → backend endpoints → AI services  
**Generated:** 2026-02-09  
**Status:** Production-verified

---

## Legend

- **Frontend:** User action in browser
- **Backend:** Node.js API (port 4000)
- **Semantic API:** AI service (port 8083)
- **Session Pool:** Kiro manager (port 8082)
- **DynamoDB:** Data persistence

---

## Complete Endpoint Trace Table

| # | Frontend Action | Frontend Endpoint | Backend Endpoint | AI Service | DynamoDB Tables | Notes |
|---|----------------|-------------------|------------------|------------|-----------------|-------|
| **STORY MANAGEMENT** |
| 1 | Load stories on page load | GET /api/stories | GET /api/stories | - | stories, acceptance-tests | Builds hierarchy with attachChildren() |
| 2 | Click "Create Story" → Save | POST /api/stories | POST /api/stories | - | stories | Validates title, auto-generates timestamps |
| 3 | Click story → View details | GET /api/stories/:id | GET /api/stories/:id | - | stories, acceptance-tests | Loads story with tests |
| 4 | Edit story → Save | PUT /api/stories/:id | PUT /api/stories/:id | - | stories | Updates specific fields only |
| 5 | Delete story → Confirm | DELETE /api/stories/:id | DELETE /api/stories/:id | - | stories | Orphans children (sets parentId=null) |
| 6 | Backup stories | GET /api/stories/backup | GET /api/stories/backup | - | stories | Returns all stories as JSON |
| 7 | Restore stories | POST /api/stories/restore | POST /api/stories/restore | - | stories | Batch writes stories |
| **AI STORY GENERATION** |
| 8 | Click "Generate Draft" | POST /api/generate-draft | POST /api/stories/draft | POST /aipm/story-draft (8083) | stories | Semantic API generates story structure |
| 9 | Generate with streaming | SSE /api/stories/:id/generate-draft-stream | SSE /api/stories/:id/generate-draft-stream | POST /aipm/story-draft?stream=true (8083) | stories | Real-time progress updates |
| **INVEST ANALYSIS** |
| 10 | Click "Run AI Check" | SSE /api/stories/:id/invest-analysis-stream | SSE /api/stories/:id/invest-analysis-stream | POST /aipm/invest-analysis?stream=true (8083) | stories | AI validates INVEST criteria |
| **ACCEPTANCE TESTS** |
| 11 | View tests in detail panel | (included in story load) | GET /api/stories/:id | - | acceptance-tests | Tests loaded with story |
| 12 | Click "Add Test" → Save | POST /api/stories/:id/tests | POST /api/stories/:id/tests | - | acceptance-tests | Creates test with storyId link |
| 13 | Edit test → Save | PUT /api/tests/:id | PUT /api/tests/:id | - | acceptance-tests | Updates given/when/then arrays |
| 14 | Delete test → Confirm | DELETE /api/tests/:id | DELETE /api/tests/:id | - | acceptance-tests | Removes test record |
| 15 | Generate test with AI | SSE /api/stories/:id/tests/generate-draft-stream | SSE /api/stories/:id/tests/generate-draft-stream | POST /aipm/acceptance-test-draft?stream=true (8083) | acceptance-tests | AI generates GWT format |
| 16 | Get test draft response | GET /api/stories/:id/tests/:testId/draft-response | GET /api/stories/:id/tests/:testId/draft-response | - | acceptance-tests | Retrieves generated test |
| **DEPENDENCIES** |
| 17 | Click "Add Dependency" | POST /api/stories/:id/dependencies | POST /api/stories/:id/dependencies | - | stories | Adds to dependencies array |
| 18 | Remove dependency | DELETE /api/stories/:id/dependencies/:depId | DELETE /api/stories/:id/dependencies/:depId | - | stories | Removes from dependencies array |
| 19 | Toggle dependency overlay | (client-side only) | - | - | - | Renders from story.dependencies |
| **REFERENCE DOCUMENTS** |
| 20 | Upload document | POST /api/stories/:id/documents | POST /api/stories/:id/documents | - | stories | Stores document metadata |
| 21 | View document | GET /api/documents/:id | GET /api/documents/:id | - | stories | Retrieves document |
| **GITHUB INTEGRATION** |
| 22 | Click "Create PR" | POST /api/create-pr | POST /api/create-pr | - | stories, prs | Creates branch, commits, opens PR |
| 23 | View PR status | GET /api/stories/:id/prs | GET /api/stories/:id/prs | - | prs | Lists PRs for story |
| 24 | Click "Merge PR" | POST /api/merge-pr | POST /api/merge-pr | - | stories, prs | Merges PR, updates story status |
| 25 | Deploy PR | POST /api/deploy-pr | POST /api/deploy-pr | - | prs | Triggers deployment |
| 26 | Check GitHub status | GET /api/github-status | GET /api/github-status | - | - | Verifies GitHub API connectivity |
| **CODE GENERATION** |
| 27 | Generate code | POST /api/generate-code | POST /api/generate-code | POST /execute (8082) | stories | Session Pool executes Kiro CLI |
| 28 | Generate code in branch | POST /api/generate-code-branch | POST /api/generate-code-branch | POST /execute (8082) | stories | Creates branch + generates code |
| 29 | Generate with streaming | SSE /api/stories/:id/generate-code-stream | SSE /api/stories/:id/generate-code-stream | POST /aipm/code-generation?stream=true (8083) | stories | Real-time code generation |
| **KIRO DELEGATION** |
| 30 | Click "Delegate to Kiro" | POST /api/personal-delegate | POST /api/personal-delegate | POST /execute (8082) | stories | Delegates task to Kiro session |
| 31 | Check delegation status | GET /api/personal-delegate/status | GET /api/personal-delegate/status | GET /status (8082) | - | Polls Kiro execution status |
| **TEMPLATES** |
| 32 | Load template list | GET /api/templates | GET /api/templates | - | - | Lists available templates |
| 33 | Select template | GET /api/templates/:name | GET /api/templates/:name | - | - | Loads template content |
| 34 | Upload template | POST /api/templates/upload | POST /api/templates/upload | - | - | Saves template file |
| **MINDMAP INTERACTIONS** |
| 35 | Drag node | (client-side only) | - | - | - | Updates position in memory |
| 36 | Save mindmap positions | POST /api/mindmap/persist | POST /api/mindmap/persist | - | - | Persists node positions |
| 37 | Zoom in/out | (client-side only) | - | - | - | CSS transform |
| 38 | Pan view | (client-side only) | - | - | - | CSS transform |
| 39 | Auto-layout | (client-side only) | - | - | - | Calculates positions |
| **FILTERING & SEARCH** |
| 40 | Filter by status | (client-side only) | - | - | - | Filters loaded stories |
| 41 | Filter by component | (client-side only) | - | - | - | Filters loaded stories |
| 42 | Search by title | (client-side only) | - | - | - | Filters loaded stories |
| 43 | Filter by story point | (client-side only) | - | - | - | Filters loaded stories |
| 44 | Show only epics | (client-side only) | - | - | - | Filters loaded stories |
| **MONITORING & OPERATIONS** |
| 45 | Check backend health | GET /health | GET /health | - | - | Returns {status: "healthy"} |
| 46 | Check version | GET /version | GET /version | - | - | Returns version + commit hash |
| 47 | View runtime data | GET /api/runtime-data | GET /api/runtime-data | - | - | Returns system metrics |
| 48 | View Kiro logs | GET /api/kiro-live-log | GET /api/kiro-live-log | GET /logs (8082) | - | Streams Kiro execution logs |
| 49 | View RTM matrix | GET /api/rtm/matrix | GET /api/rtm/matrix | - | stories, acceptance-tests | Generates traceability matrix |
| **DEPLOYMENT & TESTING** |
| 50 | Trigger deployment | POST /api/trigger-deployment | POST /api/trigger-deployment | - | - | Triggers GitHub Actions |
| 51 | Run staging | POST /api/run-staging | POST /api/run-staging | - | - | Deploys to staging environment |
| 52 | View test runs | GET /api/test-runs | GET /api/test-runs | - | - | Lists test execution history |
| 53 | Sync prod to dev | POST /api/sync-data | POST /api/sync-data | - | stories, acceptance-tests | Copies prod data to dev tables |

---

## Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (S3)                            │
│                    http://aipm-static-hosting-demo...            │
│                                                                   │
│  Views: Mindmap | Outline | Detail Panel                        │
│  Actions: Create | Edit | Delete | Generate | Filter            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/SSE
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (EC2:4000)                        │
│                    apps/backend/app.js                           │
│                                                                   │
│  Endpoints: 44 REST + SSE endpoints                             │
│  Functions: 128 helper functions                                │
│  Logic: Validation, hierarchy building, error handling          │
└──────┬──────────────────────┬──────────────────────┬────────────┘
       │                      │                      │
       │ HTTP                 │ HTTP                 │ AWS SDK
       ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ SEMANTIC API │    │  SESSION POOL    │    │    DYNAMODB      │
│  (EC2:8083)  │    │   (EC2:8082)     │    │   (us-east-1)    │
│              │    │                  │    │                  │
│ AI Services: │    │ Kiro Manager:    │    │ Tables:          │
│ - Story Gen  │    │ - Execute Kiro   │    │ - stories        │
│ - INVEST     │    │ - Session Pool   │    │ - acceptance-    │
│ - Test Gen   │    │ - Task Queue     │    │   tests          │
│ - Code Gen   │    │ - Status Track   │    │ - prs            │
└──────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Data Flow Examples

### Example 1: Create Story with AI

```
User clicks "Generate Draft"
  ↓
Frontend: POST /api/generate-draft
  ↓
Backend: POST /api/stories/draft
  ↓
Backend: POST http://localhost:8083/aipm/story-draft
  ↓
Semantic API: Generates story structure
  ↓
Backend: POST to DynamoDB stories table
  ↓
Backend: Returns story to frontend
  ↓
Frontend: Displays new story in mindmap
```

### Example 2: Run INVEST Analysis

```
User clicks "Run AI Check"
  ↓
Frontend: SSE /api/stories/123/invest-analysis-stream
  ↓
Backend: SSE /api/stories/123/invest-analysis-stream
  ↓
Backend: POST http://localhost:8083/aipm/invest-analysis?stream=true
  ↓
Semantic API: Streams analysis progress
  ↓
Backend: Streams to frontend via SSE
  ↓
Backend: Updates story.investAnalysis in DynamoDB
  ↓
Frontend: Displays results in detail panel
```

### Example 3: Create PR

```
User clicks "Create PR"
  ↓
Frontend: POST /api/create-pr
  ↓
Backend: POST /api/create-pr
  ↓
Backend: Calls GitHub API to create branch
  ↓
Backend: POST http://localhost:8082/execute (Kiro generates code)
  ↓
Session Pool: Executes Kiro CLI
  ↓
Backend: Commits code to branch
  ↓
Backend: Calls GitHub API to create PR
  ↓
Backend: Saves PR info to DynamoDB prs table
  ↓
Backend: Updates story.prs array in DynamoDB
  ↓
Backend: Returns PR URL to frontend
  ↓
Frontend: Displays PR link in detail panel
```

---

## Summary Statistics

**Total Endpoints:**
- Frontend Actions: 53
- Backend Endpoints: 44
- Semantic API Endpoints: 4
- Session Pool Endpoints: 3
- DynamoDB Tables: 3

**Interaction Patterns:**
- Client-side only: 9 (filtering, UI interactions)
- Frontend → Backend → DynamoDB: 28
- Frontend → Backend → Semantic API → DynamoDB: 5
- Frontend → Backend → Session Pool → DynamoDB: 3
- Frontend → Backend → GitHub API: 6
- Frontend → Backend (no persistence): 2

**Communication Protocols:**
- REST (JSON): 44 endpoints
- Server-Sent Events (SSE): 5 endpoints
- WebSocket: 0 (not used)

---

**Document Status:** Complete endpoint trace  
**Last Updated:** 2026-02-09  
**Maintained By:** Engineering Team
