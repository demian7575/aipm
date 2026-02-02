# AIPM Architecture

## System Overview

Full-stack web application: Vanilla JS frontend (S3) + Node.js backend (EC2) + DynamoDB + Kiro CLI for AI code generation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │ Frontend │          │ Frontend │
    │  (Prod)  │          │  (Dev)   │
    │ S3 Bucket│          │ S3 Bucket│
    └────┬─────┘          └─────┬────┘
         │                      │
         │                      │
    ┌────▼──────────────────────▼────┐
    │      EC2 Backend Servers        │
    │                                 │
    │  Production: 44.197.204.18     │
    │  Development: 44.222.168.46    │
    │                                 │
    │  ┌──────────────────────────┐  │
    │  │   Nginx (Port 80)        │  │
    │  │   - Serves frontend      │  │
    │  │   - Routes /api/ → 4000  │  │
    │  │   - Routes /api/kiro → 8081│
    │  └──────────┬───────────────┘  │
    │             │                   │
    │  ┌──────────▼───────────────┐  │
    │  │   Node.js API (Port 4000)│  │
    │  │   - REST endpoints       │  │
    │  │   - Story management     │  │
    │  │   - INVEST validation    │  │
    │  └──────────┬───────────────┘  │
    │             │                   │
    │  ┌──────────▼───────────────┐  │
    │  │ Semantic API (Port 8083) │  │
    │  │   - AI story generation  │  │
    │  │   - INVEST analysis      │  │
    │  │   - Acceptance tests     │  │
    │  │   - SSE streaming        │  │
    │  └──────────┬───────────────┘  │
    │             │                   │
    │  ┌──────────▼───────────────┐  │
    │  │ Session Pool (Port 8082) │  │
    │  │   - 4 Kiro CLI sessions  │  │
    │  │   - In-memory queue      │  │
    │  │   - Direct HTTP          │  │
    │  └──────────────────────────┘  │
    └─────────────┬───────────────────┘
                  │
         ┌────────▼────────┐
         │   DynamoDB      │
         │                 │
         │  - Stories      │
         │  - Tests        │
         │  - PRs          │
         └─────────────────┘
```

## Components

### Frontend (S3 Static Hosting)

- Vanilla JavaScript (no framework)
- Files: index.html, app.js, styles.css
- Mindmap + outline + details panel
- Real-time SSE updates

**Buckets**:
- Production: `aipm-static-hosting-demo`
- Development: `aipm-dev-frontend-hosting`

### Backend API (Node.js on EC2)

**Port**: 4000

**Responsibilities**:
- User story CRUD operations
**Responsibilities**:
- Story CRUD operations
- Acceptance test management
- PR tracking
- INVEST validation (score >= 80)
- GitHub PR integration

### Semantic API (Node.js on EC2)

**Port**: 8083

**Responsibilities**:
- Process AI templates (`templates/POST-aipm-*.md`)
- Generate story drafts, INVEST analysis, acceptance tests
- Coordinate code generation
- Stream responses via SSE

### Session Pool (Node.js on EC2)

**Port**: 8082

**Responsibilities**:
- Manage 4 persistent Kiro CLI sessions
- In-memory queue (when all sessions busy)
- Session lifecycle + stuck recovery
- Direct HTTP with Semantic API

**Requires**: Kiro CLI installed and authenticated on EC2

### Data Layer (DynamoDB)

**Tables**:

1. **Stories** (`aipm-backend-{env}-stories`)
   - User stories with INVEST metadata
   - Hierarchical (parent/child)
   - Status tracking

2. **Acceptance Tests** (`aipm-backend-{env}-acceptance-tests`)
   - GWT format
   - Linked via `storyId`
   - Status: Draft, Pass, Fail

3. **PRs** (`aipm-backend-{env}-prs`)
   - GitHub PR tracking
   - Branch + URL

**Note**: No queue table. Requests handled via HTTP/SSE with in-memory queue.

## Configuration

Single source of truth: `config/environments.yaml`

```yaml
prod:
  ec2_ip: "44.197.204.18"
  api_port: 4000
  semantic_api_port: 8083
  # ...

development:
  ec2_ip: "44.222.168.46"
  api_port: 4000
  semantic_api_port: 8083
  # ...
```

See [CONFIGURATION.md](CONFIGURATION.md) for details.

## Data Flow

### Story Creation Flow

1. User fills form in frontend
2. Frontend POSTs to `/api/stories`
3. Backend validates INVEST score (calls Semantic API if needed)
4. If score < 80, reject with error
5. If score >= 80, create story
6. Store in DynamoDB
7. Return story to frontend

### AI Story Draft Flow

1. User clicks "Generate Story" with idea
2. Frontend calls `/aipm/story-draft?stream=true` (SSE)
3. Semantic API forwards request to Session Pool via HTTP
4. Session Pool assigns available Kiro CLI session (or queues in-memory)
5. Kiro CLI generates story based on template
6. Response streams back through SSE
7. Frontend displays draft for user review

### Code Generation Flow

1. User clicks "Generate Code & PR"
2. Backend creates PR branch from main with TASK.md
3. Backend calls Semantic API with story data
4. Semantic API forwards to Session Pool via HTTP
5. Session Pool assigns Kiro CLI session (or queues if all busy)
6. Kiro CLI generates code and pushes to PR branch
7. Progress streamed back via SSE
8. Developer reviews and merges PR

## Deployment Architecture

### Production Environment
- **EC2**: 44.197.204.18 (t3.small)
- **S3**: aipm-static-hosting-demo
- **Region**: us-east-1
- **DynamoDB**: aipm-backend-prod-* tables

### Development Environment
- **EC2**: 44.222.168.46 (t3.small)
- **S3**: aipm-dev-frontend-hosting
- **Region**: us-east-1
- **DynamoDB**: aipm-backend-dev-* tables

## Security

- **API**: No authentication (internal tool)
- **DynamoDB**: IAM role-based access from EC2
- **S3**: Public read for static hosting
- **EC2**: Security group allows ports 4000, 8082, 8083

## Scalability Considerations

- **Current**: Single EC2 instance per environment
- **Database**: DynamoDB auto-scales
- **Frontend**: S3 handles high traffic
- **Bottleneck**: EC2 instance (can upgrade or add load balancer)

## Monitoring

- **Health Checks**: `/health` endpoint on port 4000
- **Gating Tests**: Automated tests in GitHub Actions
- **Manual**: Check EC2 instance status and DynamoDB metrics

## Related Documentation

- [API Reference](API_REFERENCE.md) - Detailed API documentation
- [Deployment](DEPLOYMENT.md) - Deployment procedures
- [Configuration](CONFIGURATION.md) - Environment configuration
