# AIPM Comprehensive User Stories

This document decomposes AIPM requirements into detailed, testable user stories grouped by category. Each story includes acceptance criteria to eliminate ambiguity and ensure full coverage of the platform’s behavior.

## 1. Architecture & Infrastructure
- **Story A1: Describe runtime topology**  
  As an architect, I want a clear description of frontend, backend, data stores, and auxiliary services so I can evaluate impact of changes.  
  **Acceptance Criteria:** Diagram or text lists S3-hosted frontend, EC2 backend (port 4000 via nginx 80), Kiro API (8081), terminal server (8080), DynamoDB tables (`stories`, `acceptance-tests`), and legacy Lambda/API Gateway presence.
- **Story A2: Environment endpoints**  
  As an operator, I need production and development endpoint URLs documented so I can verify deployments.  
  **Acceptance Criteria:** Production backend/frontend URLs (44.220.45.57, `aipm-static-hosting-demo` S3) and development backend/frontend URLs (44.222.168.46, `aipm-dev-frontend-hosting` S3) are explicitly listed.
- **Story A3: Legacy compatibility**  
  As a platform owner, I need Lambda/serverless compatibility documented so I can decide on cleanup or rollback.  
  **Acceptance Criteria:** `handler.mjs` usage via `@vendia/serverless-express` is described; note that EC2 is primary and Lambda is deprecated but functional.

## 2. Backend API & Data Layer
- **Story B1: Story CRUD**  
  As a backend engineer, I want REST endpoints for stories with INVEST validation so I can manage backlog items.  
  **Acceptance Criteria:** `GET/POST /api/stories`, `PUT /api/stories/{id}`, `POST /api/stories/draft`, `GET /api/stories/restore`, `POST /api/stories/backup` are documented with required fields, INVEST warnings (409) behavior, and override via `acceptWarnings`.
- **Story B2: Acceptance tests linkage**  
  As a backend engineer, I need acceptance tests tied to stories and retrievable efficiently.  
  **Acceptance Criteria:** DynamoDB `acceptance-tests` table uses PK `id` and GSI `storyId-index`; story responses include acceptance tests; automatic acceptance test generation after story creation is described.
- **Story B3: GitHub automation endpoints**  
  As a release engineer, I want endpoints to create PRs and trigger deployments.  
  **Acceptance Criteria:** `POST /api/create-pr`, `/api/personal-delegate`, `/api/deploy-pr`, `/api/merge-pr`, `/api/trigger-deployment`, `/api/personal-delegate/status` are listed with required `GITHUB_TOKEN`, owner/repo defaults, and expected responses.
- **Story B4: Health/config endpoints**  
  As an operator, I need liveness and configuration probes.  
  **Acceptance Criteria:** `/health`, `/api/version`, `/api/config/endpoints`, `/api/github-status`, `/api/system/aws-status`, `/api/system/git-status`, `/api/system/shell-status` behaviors and outputs are specified.
- **Story B5: File uploads**  
  As a user, I need to upload reference documents.  
  **Acceptance Criteria:** `POST /api/uploads` stores files under `apps/frontend/public/uploads/`; `GET /uploads/<filename>` serves them; size/location expectations documented.
- **Story B6: Data model parity**  
  As a data engineer, I need DynamoDB fields mapped to legacy SQLite shapes.  
  **Acceptance Criteria:** Stories table attributes include both snake_case and camelCase (title, description, as_a/asA, i_want/iWant, so_that/soThat, components JSON, story_point, assignee_email, status, parent_id, invest_warnings, invest_analysis, prs) with numeric `id` PK; acceptance-tests table attributes include storyId, given/when_step/then_step, status, timestamps.

## 3. Frontend UI & UX
- **Story C1: Panel synchronization**  
  As a product user, I want outline, mindmap, and detail panels to stay in sync.  
  **Acceptance Criteria:** Selecting a node updates all panels; ancestor expansion ensures visibility; right-growing mindmap renders with status styling.
- **Story C2: Mindmap layout control**  
  As a user, I can toggle auto-layout and persist manual positions.  
  **Acceptance Criteria:** Auto-layout toggle exists; manual drag positions persist via `/api/mindmap/persist` and localStorage; state restores on reload.
- **Story C3: Modal workflows**  
  As a user, I want modals for child stories, acceptance tests, reference documents, and uploads with validation and override options.  
  **Acceptance Criteria:** Each modal enforces required fields; INVEST/verifiability warnings allow override after confirmation; modals block background scroll and restore focus.
- **Story C4: Story detail richness**  
  As a user, I want INVEST feedback, tasks, dependencies, and reference documents visible in the detail panel.  
  **Acceptance Criteria:** Detail view shows INVEST warnings/health, acceptance tests, tasks with assignee enforcement, dependencies/dependents, components, status, story points, assignee email.
- **Story C5: Employee Heat Map**  
  As a manager, I want workload visualization per assignee/component.  
  **Acceptance Criteria:** Heat map modal exists with assignee filter; columns for system components; percentages total 100% per person with color intensity indicating load.
- **Story C6: Export and document generation**  
  As a PM, I need export/generation controls available.  
  **Acceptance Criteria:** Export button/modal present; Generate Document feature available with fallback when ChatGPT unavailable.

## 4. Environment Setup & Tooling
- **Story D1: Local bootstrap**  
  As a developer, I want to start the stack locally quickly.  
  **Acceptance Criteria:** `npm install` works; `npm run dev` serves backend+frontend on 4000 (fallback if busy); instructions mention optional `node apps/backend/server.js`.
- **Story D2: Env vars reference**  
  As a developer, I need a definitive env var list.  
  **Acceptance Criteria:** Core vars (`STAGE`, `AWS_REGION`, `STORIES_TABLE`, `ACCEPTANCE_TESTS_TABLE`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `EC2_PR_PROCESSOR_URL`, `PR_NUMBER`) and AI vars (`AI_PM_OPENAI_API_KEY`, `AI_PM_OPENAI_API_URL`, `AI_PM_OPENAI_MODEL`, `AI_PM_DISABLE_OPENAI`) are documented with defaults.
- **Story D3: AWS/IAM setup**  
  As DevOps, I need required permissions stated.  
  **Acceptance Criteria:** DynamoDB CRUD, CloudWatch Logs (Lambda), S3 read/write for frontend deploy, EC2 instance roles, and SSM `/aipm/github-token` are documented.

## 5. Development Workflows & PR Process
- **Story E1: Story lifecycle**  
  As a contributor, I need the process for creating and validating stories.  
  **Acceptance Criteria:** Steps include using `/api/stories`, INVEST validation with warning override, automatic acceptance test creation, draft generation via `/api/stories/draft`, and attaching references/tasks/dependencies.
- **Story E2: PR creation/assignment**  
  As a developer, I need automated PR creation tied to stories.  
  **Acceptance Criteria:** Use `/api/create-pr` or `/api/personal-delegate`; outputs include PR number/URL, branch name, confirmation code; story linkage stored.
- **Story E3: Deployment dispatch**  
  As a release engineer, I want to trigger dev deployments from the backend.  
  **Acceptance Criteria:** `/api/trigger-deployment` dispatches `deploy-pr-to-dev.yml` with PR number input; success/failure messages captured.
- **Story E4: Code generation workflow**  
  As a developer, I want Kiro-driven code generation to create PR-ready changes.  
  **Acceptance Criteria:** Task flow (create PR branch → enqueue task → worker runs `kiro-cli chat` → commits/pushes → callbacks to `/api/kiro/callback`) is described with credential requirements.

## 6. Testing & Quality Gates
- **Story F1: Gating suites**  
  As QA, I need scripted gating tests for releases.  
  **Acceptance Criteria:** Phase scripts (`phase1-security-data-safety.sh` through `phase4-workflow-validation.sh`) and orchestrators (`run-workflow-gating-tests.sh`, `run-structured-gating-tests.sh`) are listed with scope (security, performance, infrastructure, workflow).
- **Story F2: Browser validation**  
  As QA, I need environment-specific browser tests.  
  **Acceptance Criteria:** Gating HTML pages in `apps/frontend/public/*gating-tests*.html` for prod/dev are documented with URLs.
- **Story F3: Test command guidance**  
  As a developer, I need to know how `npm test` relates to gating.  
  **Acceptance Criteria:** Docs clarify `npm test` expects the gating orchestrator; phase scripts are the fallback when orchestrator unavailable.

## 7. Security & Compliance
- **Story G1: Token handling**  
  As a security lead, I want safe GitHub token management.  
  **Acceptance Criteria:** PAT stored in SSM `/aipm/github-token` for Lambda; env vars for EC2/dev; scope limited to `repo`; rotation guidance provided.
- **Story G2: Secrets in configs**  
-  As a security lead, I want to prevent secrets in frontend configs.  
  **Acceptance Criteria:** `config-dev.js`, `config-prod.js`, `config.js` never contain secrets; guidance to use env/SSM instead.
- **Story G3: Access control/IAM**  
  As an operator, I need clarity on IAM needs.  
  **Acceptance Criteria:** Required DynamoDB, CloudWatch, and S3 permissions; EC2 inbound ports limited to required services (80/443/8080/8081); GitHub status endpoint shows token validity.
- **Story G4: Data protection**  
  As a compliance owner, I need data handling rules.  
  **Acceptance Criteria:** Avoid sensitive PII in stories/uploads; uploads stored under `apps/frontend/public/uploads/`; cleanup guidance present.

## 8. Deployment & Release Management
- **Story H1: Production deploy**  
  As DevOps, I need repeatable prod deployment steps.  
  **Acceptance Criteria:** Scripts `scripts/deployment/deploy-prod-full.sh` (and variants) are referenced; validation via `curl` to root and `/api/stories` on 44.220.45.57; `deploy-config.yaml` governs stage/region/bucket.
- **Story H2: Development deploy**  
  As DevOps, I need dev deployment parity.  
  **Acceptance Criteria:** Scripts `deploy-dev-ec2.sh`, `deploy-dev-full.sh`, `deploy-dev-direct.sh` are referenced; dev endpoints (44.222.168.46, dev S3 bucket) stated.
- **Story H3: Unified configuration**  
  As DevOps, I want single-source deployment config.  
  **Acceptance Criteria:** `deploy-config.yaml` fields are listed; `deploy-to-environment` scripts consume it.
- **Story H4: CI/CD workflows**  
  As a release engineer, I want GitHub Actions coverage.  
  **Acceptance Criteria:** `.github/workflows/deploy-pr-to-dev.yml` for PRs and `deploy-to-prod.yml` for production are referenced with required secrets.

## 9. Monitoring, Logging & Troubleshooting
- **Story I1: Health probes**  
  As SRE, I need endpoints to monitor service health.  
  **Acceptance Criteria:** `/health`, `/api/version`, `/api/github-status` documented for monitoring.
- **Story I2: Log access**  
  As SRE, I need logging guidance.  
  **Acceptance Criteria:** EC2 uses systemd/journal; optional CloudWatch Agent noted; Lambda logs in CloudWatch; rotation expectations stated.
- **Story I3: Troubleshooting playbook**  
  As support, I need quick fixes for common issues.  
  **Acceptance Criteria:** Fixes include updating `config.js` for offline banner, INVEST conflict handling, GitHub token/branch/workflow errors, DynamoDB IAM/index issues.
- **Story I4: Performance diagnostics**  
  As SRE, I need guidance for performance problems.  
  **Acceptance Criteria:** Check DynamoDB throttling, Kiro throughput/queue depth, and use phase2 performance tests; scaling guidance present.

## 10. Configuration Management & Feature Flags
- **Story J1: Environment-specific configs**  
  As a maintainer, I need clear rules for per-env configs.  
  **Acceptance Criteria:** Separate `config-dev.js`, `config-prod.js`, and generated `config.js`; no secret leakage; STAGE used for table naming and version labeling.
- **Story J2: Feature flagging**  
  As a developer, I want safe rollout of new UI features.  
  **Acceptance Criteria:** Feature flags reside in frontend config; guarded checks in `app.js` required; new env vars must be documented.
- **Story J3: Runtime versioning**  
  As an operator, I want version strings aligned with environment.  
  **Acceptance Criteria:** `/api/version` uses `STAGE`, `BASE_VERSION`, `PR_NUMBER`, `PROD_VERSION`; behavior differs for dev vs prod.

## 11. Integration & Automation
- **Story K1: GitHub REST usage**  
  As an integrator, I need specifics of GitHub API use.  
  **Acceptance Criteria:** Repo default branch lookup, branch creation, optional placeholder file creation, PR creation, issue comments, workflow dispatch; retry/backoff rules documented.
- **Story K2: Kiro CLI/API**  
  As an integrator, I need Kiro interaction documented.  
  **Acceptance Criteria:** Kiro API ports, worker scripts, queue (`aipm-amazon-q-queue`), authentication requirements, and callback endpoint `/api/kiro/callback` are listed.
- **Story K3: AWS services mix**  
  As an architect, I need clarity on AWS dependencies.  
  **Acceptance Criteria:** DynamoDB, S3, EC2 primary; Lambda/API Gateway legacy; CloudWatch for logs; no other third-party runtime dependencies besides AWS SDK v3 and express wrapper.

## 12. Maintenance, Operations & DR
- **Story L1: Routine maintenance**  
  As an operator, I need a checklist of recurring tasks.  
  **Acceptance Criteria:** Token/credential rotation, upload pruning, DynamoDB usage review, Node runtime alignment, dependency updates with gating reruns.
- **Story L2: Capacity planning**  
  As an ops planner, I need scaling guidance.  
  **Acceptance Criteria:** Monitor EC2 CPU/memory, DynamoDB request volume; consider ALB/ASG for future; manage S3 transfer costs and upload limits.
- **Story L3: Disaster recovery**  
  As an ops lead, I need recovery steps.  
  **Acceptance Criteria:** DynamoDB backups via AWS Backup; ability to redeploy using `deploy-config.yaml` and `serverless.yml`; frontend redeploy to S3; notes on legacy Lambda if rollback needed.
