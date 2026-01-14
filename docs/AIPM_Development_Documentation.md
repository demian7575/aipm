# AIPM Development Documentation

**Repository Version:** 0.1.0 (from `package.json`)
**Document Status:** Updated to reflect the latest repository structure and scripts.

## 1. Introduction

### 1.1 Overview of AIPM
- AI Project Manager (AIPM) is a self-hosted workspace that manages user stories, acceptance tests, reference documents, and GitHub pull requests.
- The system provides a right-growing mindmap, outline, and detail panel powered by a Node.js backend and a vanilla JavaScript frontend.
- Data is persisted in DynamoDB tables for production and development, with optional legacy Lambda compatibility and current EC2-first hosting.

### 1.2 Purpose and Scope
- Provide a single, authoritative guide for developing, operating, and extending AIPM across backend, frontend, infrastructure, and integrations.
- Cover architecture, environment setup, workflows, deployment, testing, security, and troubleshooting so new contributors can be productive quickly.

### 1.3 Target Audience
- Backend and frontend engineers building features or fixing defects.
- DevOps engineers operating EC2, S3, and DynamoDB infrastructure or CI/CD.
- QA and release engineers running gating tests and validating deployments.
- Technical writers updating user-facing or developer documentation.

### 1.4 Document Structure
- Mirrors the required table of contents so every phase of development (design, implementation, testing, deployment, maintenance) has explicit guidance.
- Each section calls out concrete commands, file locations, and expected outcomes to remove ambiguity.

## 2. System Architecture

### 2.1 High-Level Architecture
- **Frontend**: Static assets hosted on S3; rendered entirely in vanilla JS/CSS (`apps/frontend/public`). Served locally by the backend during development.
- **Backend API**: Node.js HTTP server built with the native `http` module (`apps/backend/app.js`, started by `apps/backend/server.js`) running on EC2; legacy Serverless/Lambda wrapper (`handler.mjs`) uses Express only as an adapter.
- **Data Layer**: DynamoDB tables (`aipm-backend-<stage>-stories`, `aipm-backend-<stage>-acceptance-tests`) with a GSI on `storyId` for acceptance tests.
- **Code Generation & Delegation**: Kiro API (port 8081) plus terminal server (port 8080) for AI-assisted code workflows and worker pool management.
- **CI/CD**: GitHub Actions deploys to EC2/S3; workflow dispatch endpoints allow PR-triggered deployments.

### 2.2 Component Overview
- **HTTP/API Server**: Handles story CRUD, acceptance-test automation, upload handling, PR/deployment orchestration, health/version endpoints (`apps/backend/app.js`), started by `apps/backend/server.js`.
- **PR Metadata Helpers**: `apps/backend/story-prs.js` stores and retrieves PR links tied to stories.
- **DynamoDB Data Layer**: `apps/backend/dynamodb.js` wraps AWS SDK DocumentClient to mimic the prior SQLite interface while storing JSON-friendly fields.
- **Frontend Application**: `apps/frontend/public/app.js` drives outline, mindmap, detail panels, modal flows, and state persistence in `localStorage`.
- **Kiro Services**: Scripts under `scripts/` start Kiro API servers, queue workers, and terminal server to process AI-generated code and PR updates.
- **Infrastructure Definitions**: `serverless.yml` (legacy Lambda) and `deploy-config.yaml` (EC2/S3 configuration) capture environment and resource names.

### 2.3 Technology Stack
- **Runtime**: Node.js 18.x.
- **Backend Libraries**: `express` (used via `@vendia/serverless-express` in Lambda wrapper), AWS SDK v3 for DynamoDB, native `http` server for EC2.
- **Frontend**: Vanilla JavaScript, HTML, CSS (no bundler).
- **Infrastructure**: AWS EC2, DynamoDB, S3, optional API Gateway/Lambda legacy endpoints.
- **Version Control/CI**: GitHub with Actions workflows for PR deployments and production releases.

### 2.4 Infrastructure Diagram
- **Production**
  - S3 static hosting → Browser
  - Browser → EC2 backend (port 80 via nginx → Node on 4000)
  - Backend → DynamoDB tables (`aipm-backend-prod-*`)
  - Backend → Kiro API (8081) & terminal server (8080) for automation
- **Development**
  - Parallel EC2 instance (`44.222.168.46`) with mirrored services and dev DynamoDB tables.
- **Legacy**
  - API Gateway + Lambda remain deployed but are bypassed by EC2 in normal operation; `handler.mjs` keeps compatibility.

### 2.5 Data Flow Architecture
- **Story CRUD**: Frontend → `/api/stories` → DynamoDB via `DynamoDBDataLayer`; INVEST analysis runs before writes; automatic acceptance test creation is attempted after story creation.
- **Acceptance Tests**: Stored in `aipm-backend-<stage>-acceptance-tests`; fetched via story load operations and GSI queries on `storyId`.
- **File Uploads**: Frontend → `/api/uploads` → files saved under `apps/frontend/public/uploads/`; served via `/uploads/<filename>`.
- **GitHub Automation**: Frontend → `/api/create-pr`, `/api/personal-delegate`, `/api/deploy-pr`, `/api/merge-pr` → GitHub REST API using `GITHUB_TOKEN`.
- **Code Generation**: Frontend → `/api/generate-code` or Kiro-specific flows → Kiro API/CLI → PR pushed to GitHub → callbacks handled at `/api/kiro/callback`.
- **Health/Version**: `/health` and `/api/version` provide liveness and environment-aware version metadata.

## 3. Environment Setup

### 3.1 Prerequisites
- Node.js 18.x and npm.
- AWS CLI configured with credentials permitted to DynamoDB, S3, and (optionally) Lambda/CloudFormation.
- Git and Bash-compatible shell.
- Access to required GitHub repository with a personal access token (repo scope) stored in SSM or local env.

### 3.2 Local Development Setup
1. Install dependencies (lockfile already present):  
   ```bash
   npm install
   ```
2. Start the backend server (auto port fallback from 4000):  
   ```bash
   node apps/backend/server.js
   ```
3. Access UI at `http://localhost:4000` (or the reported fallback port). The backend serves static assets from `apps/frontend/public/`.

### 3.3 Environment Variables
- **Core Backend**
  - `STAGE` (default `prod`), `NODE_ENV` (default `production`), `AWS_REGION` (default `us-east-1`).
  - `STORIES_TABLE`, `ACCEPTANCE_TESTS_TABLE` (default to `aipm-backend-<stage>-stories` and `aipm-backend-<stage>-acceptance-tests`).
  - `GITHUB_TOKEN` (required for PR/deployment automation), `GITHUB_OWNER` (default `demian7575`), `GITHUB_REPO` (default `aipm`).
  - `EC2_PR_PROCESSOR_URL` (default `http://44.220.45.57:8082`) and `PR_NUMBER` (for environment-specific labeling).
- **AI/ChatGPT Integration**
  - `AI_PM_OPENAI_API_KEY` or `OPENAI_API_KEY`, optional `AI_PM_OPENAI_API_URL`, `AI_PM_OPENAI_MODEL`, `AI_PM_DISABLE_OPENAI`.
- **Kiro/Worker**
  - Service scripts expect access to DynamoDB queue (`aipm-amazon-q-queue`) and Git credentials; configure within shell profile used to start workers.

### 3.4 AWS Configuration
- IAM permissions for DynamoDB CRUD on the stories and acceptance-tests tables plus CloudWatch Logs for Lambda (legacy).
- EC2 instances run systemd services (backend, Kiro API, terminal server) and rely on instance roles for DynamoDB access.
- SSM Parameter Store entry `/aipm/github-token` stores the GitHub token for Lambda deployments (`serverless.yml`).

### 3.5 GitHub Integration Setup
- Generate a PAT with `repo` scope and store as `GITHUB_TOKEN` locally or in SSM for AWS environments.
- Set `GITHUB_OWNER` and `GITHUB_REPO` if working against a fork.
- Webhook-style callbacks are not required; the backend polls or receives direct responses from GitHub APIs.

## 4. Core Components

### 4.1 Backend API (Node.js)
#### 4.1.1 Server Architecture
- `apps/backend/app.js` builds an HTTP server with explicit routing and CORS handling; `apps/backend/server.js` starts it on port 4000 with automatic fallback if occupied.
- `handler.mjs` wraps the same request handler in an Express adapter for Lambda via `@vendia/serverless-express`.
- Functional responsibilities: story/acceptance operations, INVEST analysis, uploads, GitHub automation, deployment triggers, health/version endpoints.

#### 4.1.2 API Endpoints
- **Story Management**:  
  - `GET /api/stories` (optional `includeAiInvest`), `POST /api/stories`, `PUT /api/stories/{id}`, `POST /api/stories/draft` (local draft generation), `GET /api/stories/restore` (seed restore), `POST /api/stories/backup`.
- **Acceptance & Tasks**: Acceptance tests are attached during story load/creation; automatic generation runs post-story creation.
- **Uploads**: `POST /api/uploads` to store files; `GET /uploads/{filename}` to serve them.
- **GitHub/PR Automation**: `POST /api/create-pr`, `POST /api/personal-delegate`, `GET /api/personal-delegate/status`, `POST /api/deploy-pr`, `POST /api/merge-pr`, `POST /api/trigger-deployment`.
- **Code Generation**: `POST /api/generate-code`, `POST /api/kiro/callback` for Kiro responses, `POST /api/codewhisperer-status`, `POST /api/codewhisperer-rebase`.
- **System/Meta**: `GET /health`, `GET /api/version`, `GET /api/config/endpoints`, `GET /api/github-status`, `GET /api/system/*` diagnostics, `POST /api/run-staging` (validation stub).

#### 4.1.3 DynamoDB Integration
- `apps/backend/dynamodb.js` uses `DynamoDBDocumentClient` to map DynamoDB items to the legacy SQLite shape, maintaining both camelCase and snake_case fields for compatibility.
- Stories table hash key: `id` (Number).  
- Acceptance Tests table hash key: `id` (Number) with GSI `storyId-index` on `storyId` for efficient retrieval.
- Story creation and update paths support DynamoDB and SQLite code paths; DynamoDB is default in EC2 and Lambda deployments.

#### 4.1.4 GitHub API Integration
- `apps/backend/server.js` and `apps/backend/app.js` create branches and PRs using the GitHub REST API (repo default branch detection, branch creation, optional placeholder file creation, PR creation).
- Deployment triggers dispatch GitHub Actions workflow `deploy-pr-to-dev.yml` via API.
- PR metadata is persisted alongside stories when provided, enabling traceability between backlog items and code.

### 4.2 Frontend (Vanilla JavaScript)
#### 4.2.1 UI Components
- Located under `apps/frontend/public/`:
  - `index.html` bootstraps the layout with header controls and three panels.
  - `app.js` orchestrates outline tree, mindmap, detail panel, modal flows, acceptance test creation, and reference document management.
  - `styles.css` defines responsive layout and mindmap styling; vendor assets live under `vendor/`.
  - Environment-specific configs (`config-dev.js`, `config-prod.js`, `config.js`) set API endpoints and feature flags.

#### 4.2.2 Mindmap Visualization
- Right-growing SVG mindmap with auto-layout toggle and manual drag persistence (stored in backend via `/api/mindmap/persist` and client `localStorage`).
- Node selection syncs with outline; ancestor expansion ensures visible context when traversing hierarchy.

#### 4.2.3 Story Management Interface
- Outline panel for hierarchy, detail panel for INVEST analysis, acceptance tests, tasks, dependencies, and reference documents.
- Header controls for adding stories/tests, exporting documents, generating drafts, and toggling panels.
- Employee Heat Map modal visualizes workload distribution per component/assignee.

#### 4.2.4 Modal Workflows
- Modal dialogs drive creation/edit flows (child stories, acceptance tests, reference documents) with validation and warning overrides.
- File upload modal posts to `/api/uploads`; reference entries are persisted alongside stories.

### 4.3 Database Schema (DynamoDB)
#### 4.3.1 Stories Table
- **Primary Key**: `id` (Number).  
- **Attributes**: `title`, `description`, `as_a`/`asA`, `i_want`/`iWant`, `so_that`/`soThat`, `components` (JSON string), `story_point`, `assignee_email`, `status`, `parent_id`, `created_at`, `updated_at`, `invest_warnings`, `invest_analysis`, `prs` (JSON string).

#### 4.3.2 Acceptance Tests Table
- **Primary Key**: `id` (Number).  
- **GSI**: `storyId-index` on `storyId` for lookup by parent story.  
- **Attributes**: `storyId`, `title`, `given`, `when_step`, `then_step`, `status`, timestamps.

#### 4.3.3 Data Relationships
- Parent-child hierarchy represented via `parent_id` on stories; frontend/loader flattens to tree structures.
- Acceptance tests reference stories via `storyId`; UI displays them inside the story detail view.
- PR metadata is stored per story to connect backlog items to GitHub artifacts.

## 5. Development Workflows

### 5.1 Local Development
- Start the stack locally with `node apps/backend/server.js`; backend serves static frontend and exposes API on port 4000 (or fallback).
- For Lambda testing, deploy with Serverless using `serverless.yml` (ensure AWS credentials and `GITHUB_TOKEN` in SSM).

### 5.2 Testing Procedures
- Primary gating suites live under `scripts/testing/`:
  - `phase1-security-data-safety.sh`, `phase2-performance-api.sh`, `phase3-infrastructure-monitoring.sh`, `phase4-workflow-validation.sh` cover security, performance, infrastructure, and workflow checks.
  - `run-workflow-gating-tests.sh` and `run-structured-gating-tests.sh` orchestrate structured gating runs.
- Browser-based validation pages exist in `apps/frontend/public/*gating-tests*.html` for manual environment verification.
- `npm test` invokes `scripts/testing/run-all-gating-tests.sh` per `package.json`; ensure that script exists in your environment or run the phase scripts directly.

### 5.3 Code Generation with Kiro CLI
- Kiro worker scripts (`scripts/kiro-worker-*.js`, `scripts/workers` if present) poll DynamoDB queue `aipm-amazon-q-queue` for tasks initiated via “Generate Code & PR”.
- Workflow: create PR branch → enqueue task → worker runs `kiro-cli chat` → commits/pushes → backend updates PR metadata and responds via callbacks.
- Requires authenticated Kiro CLI session and Git access on the worker host.

### 5.4 Pull Request Workflow
- Use `/api/create-pr` or `/api/personal-delegate` to programmatically create PRs tied to stories.
- Deployment to dev can be triggered via `/api/trigger-deployment` (dispatches `deploy-pr-to-dev.yml` on GitHub Actions).
- Merge helpers: `/api/merge-pr`; deployment validation endpoint `/api/run-staging` exists as a stub for automated tests.

### 5.5 Story Management Process
- Create stories via UI or `POST /api/stories`; INVEST analysis enforces quality and can be overridden with `acceptWarnings`.
- Automatic acceptance test generation runs post-creation; additional tests can be added via UI modals.
- Draft generation endpoint `/api/stories/draft` produces AI-suggested story scaffolds; parent context is included when provided.
- Reference documents and tasks are attached through the detail panel and persisted with the story.

## 6. Deployment Guide

### 6.1 Deployment Architecture
- EC2-first: systemd services host backend (4000), Kiro API (8081), terminal server (8080); nginx proxies port 80.
- Frontend is uploaded to S3 buckets (`aipm-static-hosting-demo`, `aipm-dev-frontend-hosting`) with environment-specific `config.js`.
- DynamoDB tables per stage; development tables mirror production data during deploy.

### 6.2 Production Deployment
- Preferred automation via scripts under `scripts/deployment/` (e.g., `deploy-prod-full.sh`, `deploy-prod-complete.sh`) to publish backend and frontend assets and refresh configs defined in `deploy-config.yaml`.
- Validate deployment with `curl http://44.220.45.57/api/stories` and `curl http://44.220.45.57/`.

### 6.3 Development Environment Deployment
- Use `scripts/deployment/deploy-dev-ec2.sh`, `deploy-dev-full.sh`, or `deploy-dev-direct.sh` for EC2 dev updates.
- Development frontend bucket: `http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/`; backend at `http://44.222.168.46`.

### 6.4 Unified Deployment Script
- `deploy-config.yaml` centralizes stage, region, and frontend bucket settings.
- `scripts/deployment/deploy-to-environment.sh` and `scripts/deploy-to-environment.sh` accept stage-specific parameters to reuse common logic.

### 6.5 GitHub Actions CI/CD
- `.github/workflows/deploy-pr-to-dev.yml` dispatches per-PR dev deployments when triggered by `/api/trigger-deployment`.
- `.github/workflows/deploy-to-prod.yml` handles production updates; ensure secrets for AWS and GitHub tokens are configured.

### 6.6 Manual Deployment Procedures
- Sync frontend assets to S3 (per-environment `config.js`) using `scripts/deploy-frontend.sh`.
- Restart EC2 services via SSH (`sudo systemctl restart aipm-main-backend`, `kiro-api-v4`, terminal server variants).
- For Lambda compatibility, run `serverless deploy --stage <stage>` after verifying `GITHUB_TOKEN` SSM entry.

## 7. Testing Framework

### 7.1 Gating Tests Overview
- Four-phase shell suites plus structured runners under `scripts/testing/` validate security, API performance, infrastructure health, and workflow behaviors across environments.
- Frontend gating HTML pages validate presence of critical UI elements and configuration.

### 7.2 Security Validation Tests
- `phase1-security-data-safety.sh` covers authentication/authorization expectations, data safety guards, and endpoint hardening (CORS, method checks).
- Token presence checks for GitHub and AWS services are included where applicable.

### 7.3 Performance Tests
- `phase2-performance-api.sh` exercises API latency and throughput on key endpoints (`/api/stories`, `/health`, uploads) to catch regressions.

### 7.4 Infrastructure Tests
- `phase3-infrastructure-monitoring.sh` confirms EC2 services, DynamoDB accessibility, and configuration endpoints (`/api/config/endpoints`, `/api/system/*`).

### 7.5 End-to-End Workflow Tests
- `phase4-workflow-validation.sh` plus browser gating pages validate UI flows (story CRUD, mindmap rendering, acceptance test creation, export modal visibility).

### 7.6 Test Automation
- Integrate phase scripts into CI runners; ensure environment variables and network access are provided.
- Use `npm test` only when the gating orchestrator script is available; otherwise execute the phase scripts directly.

## 8. Security & Compliance

### 8.1 GitHub Token Management
- Store PAT in AWS SSM (`/aipm/github-token`) for Lambda; export locally as `GITHUB_TOKEN` for EC2/dev.
- Scope minimally to `repo`; rotate regularly and avoid embedding in code or configs committed to VCS.

### 8.2 AWS IAM Permissions
- Backend and workers need DynamoDB CRUD on stories and acceptance-tests tables plus CloudWatch Logs (for Lambda) or systemd/journal access (for EC2).
- S3 write permissions required for frontend uploads during deployment; read permissions for static hosting buckets.

### 8.3 Environment Variable Security
- Never commit secrets to `config.js`; use environment-specific copies deployed directly to S3.
- Use `.env` or shell exports locally; rely on instance roles or SSM in cloud environments.

### 8.4 Data Protection
- DynamoDB tables store textual story/test data; avoid sensitive PII in stories or uploads.
- File uploads live under `apps/frontend/public/uploads/`; restrict usage to project artifacts and clean up unused files during maintenance.

### 8.5 Access Control
- GitHub-based PR and deployment actions require valid tokens; UI surfaces token validity via `/api/github-status`.
- EC2 hosts should be restricted to necessary inbound ports (80/443, 8080/8081 as required) with security groups limiting access.

## 9. API Reference

### 9.1 Stories API
- `GET /api/stories?includeAiInvest=true|false` – list stories with optional AI analysis metadata.
- `POST /api/stories` – create story with INVEST validation (`acceptWarnings` to override).
- `PUT /api/stories/{id}` – update story fields (title, description, INVEST fields, status, components, assignee).
- `POST /api/stories/draft` – generate local AI-enhanced draft.
- `GET /api/stories/restore` / `POST /api/stories/backup` – restore/backup sample data payloads.

### 9.2 Acceptance Tests API
- Acceptance tests are generated/queried through story endpoints; DynamoDB GSI `storyId-index` enables per-story retrieval.
- Future expansions should expose dedicated endpoints following the same `/api/acceptance-tests` pattern.

### 9.3 GitHub Integration API
- `POST /api/create-pr` – create PR with branch and optional placeholder file.  
- `POST /api/personal-delegate` – create PR + task delegation; status via `GET /api/personal-delegate/status`.  
- `POST /api/deploy-pr` / `POST /api/merge-pr` – deployment/merge helpers.  
- `GET /api/github-status` – token/permission probe.

### 9.4 Health Check Endpoints
- `GET /health` – backend liveness.  
- `GET /api/system/aws-status`, `/api/system/git-status`, `/api/system/shell-status` – environment diagnostics.

### 9.5 Deployment Endpoints
- `POST /api/trigger-deployment` – dispatch GitHub Actions dev deployment workflow.  
- `GET /api/config/endpoints` – returns EC2/Kiro endpoint URLs for frontend configuration.

### 9.6 Error Handling
- Consistent JSON responses with `message` and optional `code/details`; INVEST conflicts return HTTP 409 with warning payloads.
- GitHub/API errors propagate status codes where available; client should handle 4xx for validation and 5xx for transient issues.

## 10. Frontend Development

### 10.1 Component Architecture
- Modular functions in `app.js` handle data loading, UI rendering, and event wiring; configuration injected via `config.js`.
- Mindmap, outline, and detail panels are decoupled but synchronized via shared selection state.

### 10.2 State Management
- UI state persisted in `localStorage` (panel visibility, expanded nodes, manual coordinates, selected story).
- Backend persistence for mindmap coordinates via `/api/mindmap/persist`.

### 10.3 Event Handling
- Event listeners manage clicks, keyboard navigation, drag interactions for nodes, and modal submission handling.
- Network calls use `fetch` to backend endpoints; optimistic UI updates are reconciled with server responses.

### 10.4 UI/UX Guidelines
- Keep mindmap readability (right-growing layout); maintain consistent color coding for statuses and warnings.
- Surface INVEST warnings prominently and require explicit overrides.
- Modal flows must block background scroll and restore focus after completion.

### 10.5 Responsive Design
- CSS uses flex-based layouts; ensure panels reflow on narrow widths by collapsing secondary panels and prioritizing outline/detail readability.

### 10.6 Browser Compatibility
- Target modern evergreen browsers; avoid `showModal()` (use `display: flex` toggles).  
- Test gating pages across Chrome/Firefox; ensure SVG interactions remain accessible via keyboard.

## 11. Data Management

### 11.1 DynamoDB Operations
- Use `DynamoDBDocumentClient` for JSON-like access; ensure numeric IDs are parsed with `Number()` before writes.
- Avoid storing `null` in DynamoDB; omit optional attributes (e.g., `parent_id`).

### 11.2 Data Synchronization
- Deployment scripts mirror production data into development tables to keep parity.
- Frontend config files must point to the correct stage endpoints to prevent “Using Offline Data” fallbacks.

### 11.3 Backup and Recovery
- `/api/stories/backup` accepts payloads for backup receipt confirmation; `/api/stories/restore` returns seeded sample stories for quick restoration.
- DynamoDB backups can be scheduled via AWS Backup; not automated in repo—coordinate with Ops for point-in-time recovery.

### 11.4 Data Migration
- Legacy SQLite compatibility remains in code paths; migrating requires verifying both DynamoDB and SQLite branches during updates.
- When introducing new attributes, update both camelCase and snake_case mappings in `dynamodb.js` and story loaders.

### 11.5 Performance Optimization
- Prefer GSI queries (`storyId-index`) for acceptance test lookups; avoid table scans in new endpoints.
- Batch writes/reads when extending APIs; keep payloads JSON-serializable and trimmed to necessary fields.

## 12. Integration Points

### 12.1 GitHub API Integration
- REST v3 endpoints used for repository info, branch creation, file creation (placeholder), PR creation, and issue comments.
- Rate limits handled with retry/backoff (`apps/backend/app.js` GitHub helper).

### 12.2 Kiro CLI Integration
- Backend endpoints trigger Kiro CLI tasks; scripts in `scripts/` start Kiro API servers (`kiro-api-server-*.js`) and workers.
- Ensure Kiro CLI authentication and necessary AWS/Git credentials exist on the host running workers.

### 12.3 AWS Services Integration
- DynamoDB for persistence, S3 for frontend hosting/uploads, EC2 for runtime services, optional API Gateway/Lambda legacy deployment.
- CloudWatch Logs used for Lambda; EC2 relies on systemd journal and local logs.

### 12.4 Third-Party Dependencies
- Minimal runtime deps: `express`, `@vendia/serverless-express`, AWS SDK v3. Avoid introducing heavy frontend frameworks without justification.

### 12.5 Webhook Configuration
- No external webhooks required; callbacks handled via API polling/responses. If adding webhooks (e.g., GitHub), ensure signature validation and dedicated endpoints.

## 13. Monitoring & Logging

### 13.1 Application Monitoring
- EC2: monitor systemd services and application logs; consider CloudWatch Agent for centralized metrics.
- Lambda: CloudWatch metrics/logs automatically emitted via `serverless.yml` IAM permissions.

### 13.2 Error Tracking
- Server logs emit structured messages for GitHub/API failures and INVEST validation issues; centralize via log shipping if available.

### 13.3 Performance Metrics
- Measure API latency using phase 2 performance tests; track DynamoDB throughput usage and Kiro API response times.

### 13.4 Log Management
- EC2: journalctl or service-specific logs; rotate via systemd defaults.  
- Lambda: CloudWatch Log Groups created per function; retention configured in AWS console as needed.

### 13.5 Health Checks
- `/health` endpoint for basic liveness; `/api/version` for environment-aware version strings; `/api/github-status` for integration readiness.

## 14. Troubleshooting Guide

### 14.1 Common Issues
- **“Using Offline Data” banner**: frontend pointed to wrong backend/config; update `config.js` in S3.
- **INVEST conflicts on save**: supply `acceptWarnings: true` or adjust story content to satisfy analysis.
- **PR creation failures**: validate `GITHUB_TOKEN` scope and repository ownership settings.

### 14.2 Deployment Problems
- Verify EC2 services via `systemctl status`; restart backend/Kiro services as needed.
- Confirm `deploy-config.yaml` aligns with target stage and correct S3 bucket.
- For Lambda deploys, ensure SSM parameter `/aipm/github-token` exists and AWS creds are valid.

### 14.3 GitHub Integration Issues
- 401/403 responses indicate missing/expired token; rotate PAT and redeploy.
- Branch creation conflicts: ensure unique branch names or delete stale refs.
- Workflow dispatch failures: confirm `deploy-pr-to-dev.yml` exists and repository allows workflow dispatch from token scope.

### 14.4 Database Connection Problems
- DynamoDB access errors on EC2 typically indicate missing instance role permissions; update IAM role policies.
- GSI query failures: verify `storyId-index` exists on acceptance-tests table and attribute names match payloads.

### 14.5 Performance Issues
- Check DynamoDB throttling metrics; increase read/write capacity if using provisioned mode (current config uses pay-per-request).
- Review Kiro API throughput and worker queue depth; scale EC2 or adjust polling intervals.

### 14.6 Debug Procedures
- Increase server logging around failing endpoints; reproduce locally with `npm run dev`.
- Use `curl` against `/health`, `/api/version`, `/api/config/endpoints`, `/api/stories` to isolate network vs. application errors.
- For frontend issues, open browser devtools and verify network requests to configured endpoints.

## 15. Configuration Management

### 15.1 Environment-Specific Configurations
- Maintain separate `config-dev.js`, `config-prod.js`, and generated `config.js` per environment; never share secrets inside these files.
- Backend uses `STAGE` to compute table names and version strings; ensure consistent values across services.

### 15.2 Feature Flags
- Feature toggles reside in frontend config files; add guarded checks in `app.js` when introducing new features to avoid breaking static builds.

### 15.3 Configuration Files
- `deploy-config.yaml` controls deployment stage/region/frontend bucket; `serverless.yml` defines legacy Lambda resources and env vars.
- Scripts in `scripts/` read environment variables directly; document any new ones inside this file and script headers.

### 15.4 Secrets Management
- Use AWS SSM for GitHub tokens in Lambda; use instance roles or exported env vars for EC2.
- Do not commit `.env` files or tokens; rotate tokens regularly and restrict scopes.

### 15.5 Runtime Configuration
- Backend reports version based on `STAGE`, `BASE_VERSION`, `PR_NUMBER`, `PROD_VERSION` environment variables.
- Ports: backend defaults to 4000 with fallback; Kiro API uses 8081; terminal server uses 8080.

## 16. Development Best Practices

### 16.1 Code Standards
- Use ES modules and Node 18 features; avoid try/catch around imports per repository guidelines.
- Preserve dual DynamoDB/SQLite compatibility paths when modifying persistence logic.

### 16.2 Git Workflow
- Branch from `main`; tie branches/PRs to story IDs and use backend endpoints to create PRs when automating.
- Keep commits scoped and descriptive; update documentation alongside feature changes.

### 16.3 Testing Guidelines
- Run relevant phase scripts in `scripts/testing/` for changes affecting security, performance, or workflow.
- Validate frontend changes against gating HTML pages when modifying UI components.

### 16.4 Documentation Standards
- Update this document and `README.md` when adding endpoints, environment variables, or deployment steps.
- Keep diagrams/text synchronized with infrastructure changes (EC2 vs. Lambda).

### 16.5 Security Practices
- Enforce PAT storage outside code, validate CORS/method handling for new endpoints, and ensure DynamoDB inputs are sanitized/typed.

### 16.6 Performance Guidelines
- Avoid synchronous blocking operations on hot paths; prefer streaming or batching for large payloads.
- Reuse DynamoDB clients and limit scan operations; favor queries and indexes.

## 17. Maintenance & Operations

### 17.1 Regular Maintenance Tasks
- Rotate GitHub tokens and AWS credentials; prune uploads in `apps/frontend/public/uploads/`.
- Review DynamoDB table usage and adjust indexes/TTL if introduced.

### 17.2 System Updates
- Keep Node runtime aligned with AWS Lambda/EC2 targets (Node 18.x).
- Update dependencies in `package.json` cautiously; rerun gating suites after upgrades.

### 17.3 Dependency Management
- Rely on `package-lock.json` for reproducible installs; avoid introducing large frontend packages.
- When adding AWS SDK features, stay within v3 modular packages to minimize footprint.

### 17.4 Capacity Planning
- Monitor EC2 CPU/memory and DynamoDB request volume; scale instance type or introduce auto scaling/load balancing if traffic increases.
- Consider S3 transfer costs for large uploads; enforce reasonable upload size limits at the API layer if required.

### 17.5 Disaster Recovery
- Snapshot DynamoDB via AWS Backup; document recovery procedures for restoring tables and redeploying frontend assets to S3.
- Keep infrastructure scripts version-controlled; verify ability to redeploy from scratch using `deploy-config.yaml` and `serverless.yml`.

## 18. Appendices

### 18.1 Command Reference
- Install deps: `npm install`
- Run backend locally: `node apps/backend/server.js`
- Deploy (prod): `scripts/deployment/deploy-prod-full.sh`
- Deploy (dev): `scripts/deployment/deploy-dev-ec2.sh`
- Frontend deploy: `scripts/deploy-frontend.sh`
- Test phases: `scripts/testing/phase1-security-data-safety.sh` … `phase4-workflow-validation.sh`
- Structured gating: `scripts/testing/run-structured-gating-tests.sh`

### 18.2 Configuration Templates
- `deploy-config.yaml` example:  
  ```yaml
  deployment:
    stage: "prod"
    region: "us-east-1"
  frontend:
    s3Bucket: "aipm-static-hosting-demo"
  ```
- Frontend config snippet (`config-dev.js`/`config-prod.js`):  
  ```javascript
  window.AIPM_CONFIG = {
    apiBaseUrl: "http://44.222.168.46",
    kiroApiBaseUrl: "http://44.222.168.46:8081",
    terminalUrl: "ws://44.222.168.46:8080"
  };
  ```

### 18.3 Error Code Reference
- `INVEST_WARNINGS` (409) – story fails INVEST analysis.
- `config_error` (400) – missing configuration such as GitHub token during delegation/deployment.
- `server_error` (500) – unexpected backend failure; check logs and retry.

### 18.4 Glossary
- **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable story quality framework.
- **GSI**: Global Secondary Index used in DynamoDB for querying by non-key attributes.
- **Kiro CLI**: Command-line interface used for AI-assisted code generation integrated with PR workflows.
- **PAT**: Personal Access Token for GitHub authentication.

### 18.5 External Resources
- Production frontend: `http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/`
- Development frontend: `http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/`
- Production backend: `http://44.220.45.57`
- Development backend: `http://44.222.168.46`

### 18.6 Change Log
- **2025-12-30**: Initial comprehensive development documentation aligned to EC2-first architecture, gating tests, and GitHub automation workflows.
- **2025-12-30**: Updated to match current repo structure, local startup flow, and available gating scripts.
