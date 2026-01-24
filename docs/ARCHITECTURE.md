# AIPM Architecture

## System Overview

AIPM is a full-stack web application for managing software projects with AI-powered assistance.

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
    │  └──────────┬───────────────┘  │
    │             │                   │
    │  ┌──────────▼───────────────┐  │
    │  │ Session Pool (Port 8082) │  │
    │  │   - Kiro CLI sessions    │  │
    │  │   - Request management   │  │
    │  └──────────────────────────┘  │
    └─────────────┬───────────────────┘
                  │
         ┌────────▼────────┐
         │   DynamoDB      │
         │                 │
         │  - Stories      │
         │  - Tests        │
         │  - PRs          │
         │  - Queue        │
         └─────────────────┘
```

## Components

### Frontend (S3 Static Hosting)

**Technology**: Vanilla JavaScript, HTML, CSS

**Features**:
- Mindmap visualization (right-expanding tree)
- Outline view with expand/collapse
- Story detail panel with INVEST validation
- Real-time updates via SSE
- Modal-driven workflows

**Deployment**:
- Production: `aipm-static-hosting-demo` bucket
- Development: `aipm-dev-frontend-hosting` bucket

### Backend API (Node.js on EC2)

**Port**: 4000

**Responsibilities**:
- User story CRUD operations
- Acceptance test management
- PR tracking
- INVEST score validation (80+ threshold)
- GitHub integration

**Key Endpoints**:
- `GET /api/stories` - List all stories
- `POST /api/stories` - Create story (with INVEST validation)
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story (cascade)
- `GET /health` - Health check

### Semantic API (Node.js on EC2)

**Port**: 8083

**Responsibilities**:
- AI-powered story draft generation
- INVEST analysis
- Acceptance test generation
- GWT (Given-When-Then) analysis
- Code generation coordination

**Key Endpoints**:
- `POST /aipm/story-draft?stream=true` - Generate story draft (SSE)
- `POST /aipm/invest-analysis?stream=true` - Analyze INVEST score (SSE)
- `POST /aipm/acceptance-test-draft?stream=true` - Generate tests (SSE)
- `POST /aipm/code-generation-test?stream=true` - Test code generation (SSE)

**Templates**: Uses templates in `templates/POST-aipm-*.md` for AI prompts

### Session Pool (Node.js on EC2)

**Port**: 8082

**Responsibilities**:
- Manage Kiro CLI sessions
- Queue AI requests
- Handle session lifecycle
- Stream responses back to Semantic API

**Note**: Requires local Kiro CLI installation and authentication

### Data Layer (DynamoDB)

**Tables**:

1. **Stories** (`aipm-backend-{env}-stories`)
   - User stories with INVEST metadata
   - Hierarchical relationships (parent/child)
   - Status tracking

2. **Acceptance Tests** (`aipm-backend-{env}-acceptance-tests`)
   - GWT format tests
   - Linked to stories via `storyId`
   - Status: Draft, Pass, Fail

3. **PRs** (`aipm-backend-{env}-prs`)
   - GitHub PR tracking
   - Linked to stories
   - Branch and URL information

4. **Semantic Queue** (`aipm-semantic-api-queue-{env}`)
   - AI task queue
   - Request/response tracking
   - Status management

## Configuration

All environment configuration is centralized in `config/environments.yaml`:

```yaml
production:
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
5. If score >= 80 or `skipInvestValidation=true`, create story
6. Store in DynamoDB
7. Return story to frontend

### AI Story Draft Flow

1. User clicks "Generate Story" with idea
2. Frontend calls `/aipm/story-draft?stream=true` (SSE)
3. Semantic API creates task in queue
4. Session Pool picks up task
5. Kiro CLI generates story based on template
6. Response streams back through SSE
7. Frontend displays draft for user review

### Code Generation Flow

1. User clicks "Generate Code & PR"
2. Backend creates PR branch from main
3. Task added to semantic queue
4. Session Pool picks up task
5. Kiro CLI generates code and pushes to PR
6. Developer reviews and merges PR

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
