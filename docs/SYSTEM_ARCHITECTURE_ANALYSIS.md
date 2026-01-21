# AIPM System Architecture Analysis
**Generated:** 2026-01-03 11:40 JST  
**Analysis Method:** Systematic code reading (not pattern searching)

## System Overview

AIPM is a distributed web application for managing user stories with AI-powered code generation capabilities. The system consists of multiple interconnected components across AWS infrastructure.

## Architecture Components

### 1. Frontend Layer
**Location:** `apps/frontend/public/`  
**Hosting:** AWS S3 Static Website Hosting  
**Technology:** Vanilla JavaScript, HTML, CSS

**Key Files:**
- `index.html` - Main application entry point
- `app.js` - Core application logic (7,500+ lines)
- `config.js` - Environment-specific configuration
- `styles.css` - Application styling

**Configuration:**
```javascript
window.CONFIG = {
  API_BASE_URL: 'http://3.92.96.67',        // Production EC2
  EC2_TERMINAL_URL: 'ws://3.92.96.67:8080', // WebSocket terminal
  ENVIRONMENT: 'production',
  storiesTable: 'aipm-backend-prod-stories',
  acceptanceTestsTable: 'aipm-backend-prod-acceptance-tests'
}
```

### 2. Backend Layer - Dual Server Architecture

#### 2.1 Main Backend Server
**Location:** `apps/backend/`  
**Hosting:** EC2 Instance (3.92.96.67:80 prod, 44.222.168.46:80 dev)  
**Technology:** Node.js HTTP Server  
**Primary Purpose:** Story management, data persistence, GitHub integration

**Key Files:**
- `server.js` - Server entry point and PR creation logic
- `app.js` - Main HTTP server and API endpoints (7,420 lines)
- `dynamodb.js` - Database abstraction layer
- `story-generator.js` - Story generation logic

**Core Endpoints:**
```
GET  /api/stories              - Fetch all stories
POST /api/stories              - Create new story
PUT  /api/stories/:id          - Update story
PATCH /api/stories/:id         - Partial story update
DELETE /api/stories/:id        - Delete story
POST /api/create-pr            - Create GitHub PR
POST /api/deploy-pr            - Deploy PR to staging
POST /api/sync-data            - Mirror production to development
POST /api/deploy-backend       - Deploy backend code
```

#### 2.2 Kiro API Server
**Location:** `scripts/kiro-api-server-v4.js`  
**Hosting:** EC2 Instance (Port 8081)  
**Technology:** Node.js HTTP Server with Kiro CLI integration  
**Primary Purpose:** AI code generation, template processing

**Key Features:**
- Kiro CLI process management
- Template system for code generation
- Request queuing and completion detection
- Git operations for PR management

**Core Endpoints:**
```
GET  /health                   - Health check
POST /api/generate-code-branch - Generate code for PR branch
POST /api/enhance              - Enhance code with Kiro CLI
POST /api/templates            - Template management
POST /api/kiro-live-log        - Live Kiro CLI logs
GET  /api/stories              - Story management (duplicate)
```

### 3. Database Layer
**Technology:** AWS DynamoDB  
**Tables:**
- `aipm-backend-prod-stories` - Production user stories
- `aipm-backend-prod-acceptance-tests` - Production acceptance tests
- `aipm-backend-dev-stories` - Development user stories
- `aipm-backend-dev-acceptance-tests` - Development acceptance tests

**Data Layer:** `apps/backend/dynamodb.js`
- Provides SQLite-compatible interface over DynamoDB
- Handles CRUD operations for stories and acceptance tests
- Implements batch operations for data synchronization

### 4. AI Integration Layer
**Technology:** Kiro CLI (Amazon Q Developer)  
**Integration Method:** Child process spawning with PTY  
**Template System:** Markdown-based contracts in `templates/`

**Key Templates:**
- `code-generation.md` - Code generation workflow
- `user-story-generation.md` - Story creation workflow
- `user-story-generation.json` - Legacy JSON template

### 5. GitHub Integration
**API:** GitHub REST API v4  
**Authentication:** Personal Access Token (GITHUB_TOKEN env var)  
**Operations:**
- PR creation and management
- Branch operations
- Status updates
- Merge operations

### 6. AWS Infrastructure

#### 6.1 EC2 Instances
**Production:** `3.92.96.67`
- Main Backend Server (Port 80)
- Kiro API Server (Port 8081)
- WebSocket Terminal (Port 8080)

**Development:** `44.222.168.46`
- Main Backend Server (Port 80)
- Kiro API Server (Port 8081)
- WebSocket Terminal (Port 8080)

#### 6.2 S3 Buckets
**Production Frontend:** `aipm-static-hosting-demo`
**Development Frontend:** `aipm-dev-frontend-hosting`
**Deployment Assets:** `aipm-deployments-728378229251`

#### 6.3 DynamoDB Tables
- Regional deployment in `us-east-1`
- Separate prod/dev table sets
- Batch operations for data synchronization

### 7. CI/CD Pipeline
**Technology:** GitHub Actions  
**Key Workflows:**

#### 7.1 PR Deployment (`deploy-pr-to-dev.yml`)
**Triggers:** PR opened, synchronized, reopened
**Process:**
1. Checkout and rebase PR branch
2. Handle merge conflicts with Kiro CLI
3. Deploy backend to development EC2
4. Deploy frontend to development S3
5. Mirror production data to development
6. Run health checks

#### 7.2 Production Deployment
**Triggers:** Manual or main branch push
**Process:**
1. Run gating tests
2. Deploy backend to production EC2
3. Deploy frontend to production S3
4. Verify deployment health

## Data Flow Analysis

### 1. User Story Creation Flow
```
Frontend (app.js) 
  → POST /api/stories 
  → Main Backend (app.js)
  → DynamoDB (stories table)
  → Response to Frontend
  → UI Update (outline/mindmap)
```

### 2. Code Generation Flow
```
Frontend "Generate Code" button
  → POST /api/generate-code-branch
  → Kiro API Server (kiro-api-server-v4.js)
  → Kiro CLI process spawn
  → Template processing (templates/*.md)
  → Code generation
  → Git operations (commit/push)
  → GitHub PR update
  → Response to Frontend
```

### 3. PR Creation Flow
```
Frontend "Create PR" button
  → POST /api/create-pr
  → Main Backend (server.js)
  → GitHub API (create branch/PR)
  → DynamoDB (update story with PR info)
  → Response to Frontend
  → UI Update (Development Tasks)
```

### 4. Data Synchronization Flow
```
GitHub Actions (deploy-pr-to-dev.yml)
  → POST /api/sync-data
  → Main Backend (app.js)
  → DynamoDB Scan (production table)
  → DynamoDB BatchWrite (delete dev data)
  → DynamoDB BatchWrite (import prod data)
  → Response to GitHub Actions
```

## System Integration Points

### 1. Frontend ↔ Main Backend
- **Protocol:** HTTP/HTTPS REST API
- **Authentication:** None (public endpoints)
- **Data Format:** JSON
- **Error Handling:** HTTP status codes + JSON error responses

### 2. Frontend ↔ Kiro API Server
- **Protocol:** HTTP REST API
- **Port:** 8081
- **Purpose:** Code generation requests
- **Data Format:** JSON with template parameters

### 3. Main Backend ↔ DynamoDB
- **Protocol:** AWS SDK (DynamoDBDocumentClient)
- **Operations:** CRUD + Batch operations
- **Consistency:** Eventually consistent reads
- **Error Handling:** AWS SDK exceptions

### 4. Kiro API Server ↔ Kiro CLI
- **Protocol:** Child process with PTY
- **Communication:** stdin/stdout streams
- **Completion Detection:** Multi-signal (git ops + time markers + idle timeout)
- **Error Handling:** Process exit codes + output parsing

### 5. Backend ↔ GitHub API
- **Protocol:** HTTPS REST API
- **Authentication:** Bearer token (PAT)
- **Rate Limiting:** GitHub API limits
- **Error Handling:** HTTP status codes + retry logic

### 6. GitHub Actions ↔ AWS
- **EC2 Deployment:** SSH + SCP file transfer
- **S3 Deployment:** AWS CLI
- **Authentication:** AWS credentials in GitHub Secrets

## Architecture Issues Identified

### 1. Duplicate Functionality
**Problem:** Both Main Backend and Kiro API Server handle similar endpoints:
- `/api/stories` - Story management
- `/api/create-pr` - PR creation
- `/api/generate-code-branch` - Code generation

**Impact:** Confusion, maintenance overhead, potential inconsistencies

### 2. Missing Local Files
**Problem:** Local repository missing `apps/backend/` structure that exists on servers
**Impact:** Deployment failures, development environment inconsistencies

### 3. Port Conflicts
**Problem:** Multiple services on same EC2 instances using different ports
**Impact:** Complexity in routing, firewall management, service discovery

### 4. Data Synchronization Complexity
**Problem:** Manual data mirroring between prod/dev environments
**Impact:** Data inconsistencies, deployment complexity

## Recommendations

### 1. Consolidate Backend Services
- Merge Kiro API Server functionality into Main Backend
- Eliminate duplicate endpoints
- Use single port (80) with path-based routing

### 2. Standardize Repository Structure
- Ensure local repository matches deployed structure
- Add missing backend files to version control
- Update deployment scripts accordingly

### 3. Implement Service Discovery
- Use environment variables for service endpoints
- Implement health check aggregation
- Add service registry for dynamic configuration

### 4. Automate Data Synchronization
- Implement real-time data replication
- Use DynamoDB Streams for change propagation
- Add data validation and consistency checks

## Deployment Architecture

### Current State
```
GitHub Repository
  ├── Frontend (S3 Static Hosting)
  ├── Main Backend (EC2:80)
  ├── Kiro API Server (EC2:8081)
  └── DynamoDB Tables

GitHub Actions
  ├── PR Deployment → Development Environment
  ├── Production Deployment → Production Environment
  └── Health Checks → Both Environments
```

### Recommended State
```
GitHub Repository
  ├── Unified Frontend (S3 Static Hosting)
  ├── Unified Backend (EC2:80 with internal routing)
  └── DynamoDB Tables with Streams

GitHub Actions
  ├── Automated PR Deployment with Testing
  ├── Blue/Green Production Deployment
  └── Continuous Health Monitoring
```

This analysis provides a complete understanding of the AIPM system architecture based on systematic code reading rather than pattern searching.
