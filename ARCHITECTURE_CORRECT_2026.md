# AIPM Current Architecture - 2026-01-21

## System Overview

AIPM uses **Semantic API** (not Kiro API directly) for AI-powered features.

```
Frontend (S3) → Backend API → DynamoDB
                    ↓
              Semantic API (Port 8083)
                    ↓
           Kiro Session Pool (Port 8082)
                    ↓
              Kiro CLI (Local)
```

## Architecture Components

### 1. Frontend (S3 Static Hosting)
- **Production**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
- **Technology**: Vanilla JavaScript (no build process)
- **Files**: `apps/frontend/public/`

### 2. Backend API (EC2 + Node.js)
- **Production**: http://3.92.96.67 (Port 80 → nginx → 4000)
- **Development**: http://44.222.168.46 (Port 80 → nginx → 4000)
- **Technology**: Node.js 18+ (Express)
- **Files**: `apps/backend/app.js`
- **Database**: DynamoDB

### 3. Semantic API (Port 8083)
- **Purpose**: AI-powered story/test generation and analysis
- **Technology**: Node.js
- **Files**: `scripts/semantic-api-server-v2.js`
- **Templates**: `templates/POST-*.md`
- **Endpoints**:
  - `/api/story-draft-response`
  - `/api/acceptance-test-draft-response`
  - `/api/invest-analysis-response`
  - `/api/gwt-analysis-response`
  - `/api/code-generation-response`

### 4. Kiro Session Pool (Port 8082)
- **Purpose**: Manage Kiro CLI sessions for concurrent requests
- **Technology**: Node.js
- **Files**: `scripts/kiro-session-pool.js`
- **Pool Size**: 2 sessions
- **Session Timeout**: 180 seconds

### 5. Kiro CLI (Local Process)
- **Purpose**: Amazon Q Developer CLI for code generation
- **Invoked By**: Kiro Session Pool
- **Templates**: Read from `templates/` directory

## Data Flow

### User Story Creation with AI
```
1. User clicks "Generate Story" in Frontend
2. Frontend → Backend API: POST /api/stories
3. Backend → Semantic API: POST /api/story-draft
4. Semantic API → Kiro Session Pool: Execute template
5. Kiro Session Pool → Kiro CLI: Run with template
6. Kiro CLI: Reads POST-aipm-story-draft.md
7. Kiro CLI: Includes SEMANTIC_API_GUIDELINES.md
8. Kiro CLI: Generates story + acceptance tests
9. Kiro CLI → Semantic API: curl POST response
10. Semantic API → Backend: Return generated story
11. Backend → DynamoDB: Save story
12. Backend → Frontend: Return created story
```

### INVEST Analysis
```
1. User clicks "Run AI Check" in Frontend
2. Frontend → Backend API: POST /api/stories/:id/health-check
3. Backend → Semantic API: POST /api/invest-analysis
4. Semantic API → Kiro CLI: Analyze with template
5. Kiro CLI: Reads POST-aipm-invest-analysis.md
6. Kiro CLI: Evaluates INVEST principles
7. Kiro CLI → Semantic API: curl POST response
8. Semantic API → Backend: Return analysis
9. Backend → DynamoDB: Update story.investAnalysis
10. Backend → Frontend: Return analysis results
```

## Port Mapping

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Frontend | 80 (S3) | HTTP | Public |
| Backend API | 4000 | HTTP | Internal (nginx proxy) |
| Nginx | 80 | HTTP | Public |
| Semantic API | 8083 | HTTP | Internal |
| Kiro Session Pool | 8082 | HTTP | Internal |
| Kiro CLI | - | Process | Local |

## Service Dependencies

```
Frontend (S3)
  └─ depends on → Backend API (EC2:80)

Backend API (EC2:4000)
  ├─ depends on → DynamoDB
  └─ depends on → Semantic API (8083)

Semantic API (8083)
  ├─ depends on → Kiro Session Pool (8082)
  └─ depends on → Templates (templates/*.md)

Kiro Session Pool (8082)
  └─ depends on → Kiro CLI (local process)

Kiro CLI
  └─ depends on → Templates (templates/*.md)
```

## Template System

### Template Files
- `SEMANTIC_API_GUIDELINES.md` (35 lines) - Common sections for all templates
- `ACCEPTANCE_TEST_GUIDELINES.md` (79 lines) - Test writing guidelines
- `POST-aipm-story-draft.md` (77 lines) - User story generation
- `POST-aipm-acceptance-test-draft.md` (54 lines) - Acceptance test generation
- `POST-aipm-invest-analysis.md` (59 lines) - INVEST analysis
- `POST-aipm-gwt-analysis.md` (41 lines) - GWT test analysis
- `POST-aipm-code-generation.md` (45 lines) - Code generation

### Template Include Mechanism
Each template includes common guidelines:
```markdown
**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`
```

Kiro CLI reads both files when executing.

## DynamoDB Tables

| Table | Purpose |
|-------|---------|
| `aipm-backend-prod-stories` | Production user stories |
| `aipm-backend-prod-acceptance-tests` | Production acceptance tests |
| `aipm-backend-dev-stories` | Development user stories |
| `aipm-backend-dev-acceptance-tests` | Development acceptance tests |
| `aipm-amazon-q-queue` | Code generation task queue |
| `aipm-semantic-queue` | Semantic API request queue |

## Systemd Services

### Production (3.92.96.67)
- `aipm-main-backend.service` - Main backend API
- `aipm-semantic-api.service` - Semantic API
- `kiro-session-pool.service` - Kiro session pool
- `nginx.service` - Reverse proxy

### Development (44.222.168.46)
- `aipm-dev-backend.service` - Dev backend API
- `aipm-semantic-api-dev.service` - Dev Semantic API
- `kiro-session-pool-dev.service` - Dev Kiro session pool
- `nginx.service` - Reverse proxy

## Key Differences from Old Architecture

### ❌ OLD (Incorrect Understanding)
```
Backend → Kiro API (Port 8081) → Code Generation
```

### ✅ NEW (Actual Architecture)
```
Backend → Semantic API (Port 8083) → Kiro Session Pool (Port 8082) → Kiro CLI
```

## Important Notes

1. **No Direct Kiro API**: Backend never calls Kiro API directly
2. **Semantic API is the Gateway**: All AI features go through Semantic API
3. **Templates are Critical**: Kiro CLI reads templates for every request
4. **Session Pool Manages Concurrency**: Handles multiple concurrent AI requests
5. **Port 8081 is NOT Used**: Old Kiro API port is deprecated

## Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Backend API | `http://44.222.168.46/health` | `{"status":"running"}` |
| Semantic API | `http://localhost:8083/health` | `{"status":"healthy"}` |
| Kiro Session Pool | `http://localhost:8082/health` | `{"status":"healthy"}` |

## Testing Implications

### ✅ Correct Test Targets
- Backend API: Port 80 (public)
- Semantic API: Port 8083 (internal, SSH required)
- Kiro Session Pool: Port 8082 (internal, SSH required)

### ❌ Incorrect Test Targets
- ~~Kiro API: Port 8081~~ (doesn't exist)
- ~~Code Generation Endpoint: Port 8081~~ (wrong port)

## Next Steps for Test Updates

1. Update gating tests to check Semantic API (8083) instead of Kiro API (8081)
2. Remove references to "Kiro API" in test scripts
3. Add Semantic API health checks
4. Validate template system in tests
5. Test template include mechanism
