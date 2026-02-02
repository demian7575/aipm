# AIPM System Architecture - Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    AWS Cloud (us-east-1)                             │
│                                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Frontend Layer (S3)                                │ │
│  │                                                                                  │ │
│  │  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐   │ │
│  │  │  Production S3 Bucket             │  │  Development S3 Bucket            │   │ │
│  │  │  aipm-static-hosting-demo        │  │  aipm-dev-frontend-hosting       │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  • index.html                     │  │  • index.html                     │   │ │
│  │  │  • app.js (Vanilla JS)            │  │  • app.js (Vanilla JS)            │   │ │
│  │  │  • styles.css                     │  │  • styles.css                     │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  Static Website Hosting           │  │  Static Website Hosting           │   │ │
│  │  └──────────────────────────────────┘  └──────────────────────────────────┘   │ │
│  │           │                                        │                             │ │
│  └───────────┼────────────────────────────────────────┼─────────────────────────────┘ │
│              │                                        │                               │
│              │ HTTP                                   │ HTTP                          │
│              ▼                                        ▼                               │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           Backend Layer (EC2 Instances)                         │ │
│  │                                                                                  │ │
│  │  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐   │ │
│  │  │  Production EC2                   │  │  Development EC2                  │   │ │
│  │  │  44.197.204.18                    │  │  44.222.168.46                    │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  ┌─────────────────────────────┐ │  │  ┌─────────────────────────────┐ │   │ │
│  │  │  │ Backend API (Port 4000)     │ │  │  │ Backend API (Port 4000)     │ │   │ │
│  │  │  │ • Node.js + Express         │ │  │  │ • Node.js + Express         │ │   │ │
│  │  │  │ • app.js (REST API)         │ │  │  │ • app.js (REST API)         │ │   │ │
│  │  │  │ • INVEST validation         │ │  │  │ • INVEST validation         │ │   │ │
│  │  │  │ • GitHub PR management      │ │  │  │ • GitHub PR management      │ │   │ │
│  │  │  └─────────────────────────────┘ │  │  └─────────────────────────────┘ │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  ┌─────────────────────────────┐ │  │  ┌─────────────────────────────┐ │   │ │
│  │  │  │ Semantic API (Port 8083)    │ │  │  │ Semantic API (Port 8083)    │ │   │ │
│  │  │  │ • semantic-api-server-v2.js │ │  │  │ • semantic-api-server-v2.js │ │   │ │
│  │  │  │ • Template processor        │ │  │  │ • Template processor        │ │   │ │
│  │  │  │ • SSE response handler      │ │  │  │ • SSE response handler      │ │   │ │
│  │  │  └─────────────────────────────┘ │  │  └─────────────────────────────┘ │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  ┌─────────────────────────────┐ │  │  ┌─────────────────────────────┐ │   │ │
│  │  │  │ Kiro Session Pool (8082)    │ │  │  │ Kiro Session Pool (8082)    │ │   │ │
│  │  │  │ • kiro-session-pool.js      │ │  │  │ • kiro-session-pool.js      │ │   │ │
│  │  │  │ • 4 Kiro CLI sessions       │ │  │  │ • 4 Kiro CLI sessions       │ │   │ │
│  │  │  │ • In-memory request queue   │ │  │  │ • In-memory request queue   │ │   │ │
│  │  │  │ • Stuck recovery            │ │  │  │ • Stuck recovery            │ │   │ │
│  │  │  └─────────────────────────────┘ │  │  └─────────────────────────────┘ │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  All services run as systemd     │  │  All services run as systemd     │   │ │
│  │  │  units (auto-restart on failure) │  │  units (auto-restart on failure) │   │ │
│  │  └──────────────────────────────────┘  └──────────────────────────────────┘   │ │
│  │              │                                        │                         │ │
│  └──────────────┼────────────────────────────────────────┼─────────────────────────┘ │
│                 │                                        │                           │
│                 │ AWS SDK                                │ AWS SDK                   │
│                 ▼                                        ▼                           │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           Data Layer (DynamoDB)                                 │ │
│  │                                                                                  │ │
│  │  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐   │ │
│  │  │  Production Tables                │  │  Development Tables               │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  • aipm-backend-prod-stories     │  │  • aipm-backend-dev-stories      │   │ │
│  │  │  • aipm-backend-prod-acceptance- │  │  • aipm-backend-dev-acceptance-  │   │ │
│  │  │    tests                          │  │    tests                          │   │ │
│  │  │  • aipm-backend-prod-prs          │  │  • aipm-backend-dev-prs          │   │ │
│  │  │                                   │  │                                   │   │ │
│  │  │  Schema:                          │  │  Schema:                          │   │ │
│  │  │  - Stories: id, title, desc, etc  │  │  - Stories: id, title, desc, etc │   │ │
│  │  │  - Tests: id, storyId, title, etc │  │  - Tests: id, storyId, title, etc│   │ │
│  │  │  - PRs: storyId, prNumber, branch │  │  - PRs: storyId, prNumber, branch│   │ │
│  │  └──────────────────────────────────┘  └──────────────────────────────────┘   │ │
│  │                                                                                  │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              External Services                                        │
│                                                                                       │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐         │
│  │  GitHub API                       │  │  Kiro CLI (AWS)                   │         │
│  │  • PR creation/management         │  │  • AI code generation             │         │
│  │  • Branch operations              │  │  • Template processing            │         │
│  │  • Code push/pull                 │  │  • Bash command execution         │         │
│  │                                   │  │  • Browser authentication         │         │
│  │  Used by: Backend API             │  │  Used by: Session Pool            │         │
│  └──────────────────────────────────┘  └──────────────────────────────────┘         │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD Pipeline (GitHub Actions)                          │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  Workflows                                                                     │   │
│  │                                                                                │   │
│  │  1. deploy-to-prod.yml                                                        │   │
│  │     • Trigger: Push to main branch                                            │   │
│  │     • Actions:                                                                │   │
│  │       - Run gating tests (Phase 1, 2, 4)                                      │   │
│  │       - Deploy to Production EC2                                              │   │
│  │       - Restart services (API, Semantic API, Session Pool)                    │   │
│  │       - Deploy frontend to S3                                                 │   │
│  │                                                                                │   │
│  │  2. deploy-pr-to-dev.yml                                                      │   │
│  │     • Trigger: PR opened/updated                                              │   │
│  │     • Actions:                                                                │   │
│  │       - Run gating tests                                                      │   │
│  │       - Deploy to Development EC2                                             │   │
│  │       - Deploy frontend to Dev S3                                             │   │
│  │                                                                                │   │
│  │  3. restart-semantic-api.yml                                                  │   │
│  │     • Trigger: Manual dispatch                                                │   │
│  │     • Actions: Restart Semantic API service                                   │   │
│  │                                                                                │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Configuration Management                                 │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  config/environments.yaml (Single Source of Truth)                            │   │
│  │                                                                                │   │
│  │  prod:                                                                         │   │
│  │    ec2_ip: 44.197.204.18                                                      │   │
│  │    api_port: 4000                                                             │   │
│  │    semantic_api_port: 8083                                                    │   │
│  │    s3_bucket: aipm-static-hosting-demo                                        │   │
│  │    dynamodb_stories_table: aipm-backend-prod-stories                          │   │
│  │    dynamodb_tests_table: aipm-backend-prod-acceptance-tests                   │   │
│  │    dynamodb_prs_table: aipm-backend-prod-prs                                  │   │
│  │                                                                                │   │
│  │  dev:                                                                          │   │
│  │    ec2_ip: 44.222.168.46                                                      │   │
│  │    api_port: 4000                                                             │   │
│  │    semantic_api_port: 8083                                                    │   │
│  │    s3_bucket: aipm-dev-frontend-hosting                                       │   │
│  │    dynamodb_stories_table: aipm-backend-dev-stories                           │   │
│  │    dynamodb_tests_table: aipm-backend-dev-acceptance-tests                    │   │
│  │    dynamodb_prs_table: aipm-backend-dev-prs                                   │   │
│  │                                                                                │   │
│  │  Used by: All deployment scripts, GitHub Actions, services                    │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Story Creation Flow

```
┌──────────┐     HTTP POST      ┌──────────────┐     AWS SDK      ┌──────────────┐
│          │  /api/stories      │              │   PutItem        │              │
│ Frontend ├───────────────────►│ Backend API  ├─────────────────►│  DynamoDB    │
│ (S3)     │                    │ (EC2:4000)   │                  │  Stories     │
│          │◄───────────────────┤              │◄─────────────────┤  Table       │
└──────────┘     JSON Response  └──────────────┘     Item Data    └──────────────┘
```

### 2. AI Code Generation Flow

```
┌──────────┐  1. Generate Code  ┌──────────────┐  2. SSE Connect  ┌──────────────┐
│          │     Button Click   │              │                  │              │
│ Frontend ├───────────────────►│ Backend API  ├─────────────────►│ Semantic API │
│          │                    │              │                  │ (EC2:8083)   │
└──────────┘                    └──────────────┘                  └──────┬───────┘
                                                                          │
                                                                          │ 3. Forward
                                                                          ▼
┌──────────┐  7. SSE Progress   ┌──────────────┐  4. Get Session ┌──────────────┐
│          │◄───────────────────┤              │◄────────────────┤              │
│ Frontend │                    │ Semantic API │                 │ Session Pool │
│          │                    │              │                 │ (EC2:8082)   │
└──────────┘                    └──────────────┘                 └──────┬───────┘
                                        ▲                                │
                                        │                                │
                                        │ 6. Curl Callback               │ 5. Execute
                                        │                                ▼
                                ┌──────────────────────────────────────────────┐
                                │  Kiro CLI Session (1 of 4)                   │
                                │  • Load template                             │
                                │  • Execute bash commands                     │
                                │  • Generate code                             │
                                │  • Git commit/push                           │
                                └──────────────────────────────────────────────┘

Note: If all 4 sessions are busy, request is queued in-memory (no DynamoDB)
```

### 3. Deployment Flow

```
┌──────────────┐  1. Push to    ┌──────────────┐  2. Trigger     ┌──────────────┐
│              │     main        │              │                 │              │
│  Developer   ├────────────────►│   GitHub     ├────────────────►│ GitHub       │
│              │                 │  Repository  │                 │ Actions      │
└──────────────┘                 └──────────────┘                 └──────┬───────┘
                                                                          │
                                                                          │ 3. Run Tests
                                                                          ▼
                                                                  ┌──────────────┐
                                                                  │ Gating Tests │
                                                                  │ • Phase 1    │
                                                                  │ • Phase 2    │
                                                                  │ • Phase 4    │
                                                                  └──────┬───────┘
                                                                          │
                                                                          │ 4. Deploy
                                                                          ▼
┌──────────────┐  5. Deploy      ┌──────────────┐  6. Restart    ┌──────────────┐
│              │     Frontend    │              │     Services    │              │
│  S3 Bucket   │◄────────────────┤ GitHub       ├────────────────►│  EC2 Prod    │
│  (Static)    │                 │ Actions      │                 │  Instance    │
└──────────────┘                 └──────────────┘                 └──────────────┘
```

## Component Details

### Frontend (S3 Static Hosting)
- **Technology**: Vanilla JavaScript (no framework)
- **Files**: index.html, app.js, styles.css
- **Features**:
  - Mindmap visualization
  - Outline tree view
  - Story details panel
  - Real-time SSE updates
  - GitHub PR integration UI

### Backend API (EC2 Node.js)
- **Technology**: Node.js 18+, Express 5
- **Port**: 4000
- **Responsibilities**:
  - REST API for stories/tests/PRs
  - INVEST validation
  - GitHub PR management
  - DynamoDB operations
  - SSE endpoint for AI progress

### Semantic API (EC2 Node.js)
- **Technology**: Node.js 18+
- **Port**: 8083
- **Responsibilities**:
  - Process AI templates
  - Manage SSE connections
  - Route requests to Session Pool
  - Handle Kiro callbacks

### Kiro Session Pool (EC2 Node.js)
- **Technology**: Node.js 18+
- **Port**: 8082
- **Responsibilities**:
  - Manage 4 persistent Kiro CLI sessions
  - In-memory queue for requests when all sessions busy
  - Detect and recover stuck sessions
  - Execute AI code generation
  - Direct HTTP communication (no DynamoDB polling)

### DynamoDB Tables
- **Stories**: User story data (id, title, description, status, etc.)
- **Acceptance Tests**: Test cases linked to stories
- **PRs**: GitHub PR tracking (storyId, prNumber, branch)

**Note**: No queue table - requests are handled via HTTP/SSE with in-memory queuing

### GitHub Actions
- **deploy-to-prod.yml**: Main → Production deployment
- **deploy-pr-to-dev.yml**: PR → Development deployment
- **restart-semantic-api.yml**: Manual service restart

## Key Design Decisions

1. **Dual Environment**: Separate prod/dev EC2 instances with isolated DynamoDB tables
2. **Static Frontend**: S3 hosting for scalability and cost efficiency
3. **Session Pool**: Persistent Kiro CLI sessions to avoid startup overhead
4. **In-Memory Queue**: Fast request queuing without DynamoDB overhead
5. **SSE for Progress**: Real-time updates during long AI operations
6. **Systemd Services**: Auto-restart on failure for reliability
7. **Single Config Source**: environments.yaml prevents configuration drift
8. **Gating Tests**: Automated quality gates before deployment
9. **Direct HTTP Communication**: No polling, immediate request processing

## Network Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Backend API | 4000 | HTTP | REST API + SSE |
| Semantic API | 8083 | HTTP | AI template processing |
| Session Pool | 8082 | HTTP | Kiro session management |
| Terminal (unused) | 8080 | HTTP | Reserved |

## Security

- **EC2 Security Groups**: Restrict inbound to necessary ports
- **GitHub Token**: Stored in environment variables
- **DynamoDB IAM**: EC2 instance role with table access
- **S3 Bucket Policy**: Public read for static hosting
- **No Secrets in Code**: All credentials via environment/IAM

## Monitoring & Logging

- **Systemd Logs**: `journalctl -u <service-name> -f`
- **Application Logs**: `/tmp/kiro-cli-live.log`
- **Health Checks**: `/health` endpoints on all services
- **Session Pool Status**: `/status` endpoint shows queue length and session states

## Legacy Components (Removed)

The following components existed in earlier versions but are no longer used:
- ❌ `aipm-semantic-api-queue-prod/dev` DynamoDB tables (replaced by in-memory queue)
- ❌ `queue-cleanup.js` service (no longer needed without DynamoDB queue)
- ❌ Polling-based architecture (replaced by direct HTTP/SSE)
