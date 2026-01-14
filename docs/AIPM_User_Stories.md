# AIPM Comprehensive User Stories

**Repository Version:** 0.1.0 (from `package.json`)
**Document Status:** Updated to reflect the latest repository structure and scripts.

This document decomposes AIPM requirements into a hierarchical set of root user stories (epics) with nested, detailed stories and acceptance criteria. The goal is to keep the structure concise at the top level (fewer than five root stories) while fully covering AIPM requirements. Depth is capped below five levels.

## Root Story 1: System Architecture & Platform Foundations
- **Story 1.1: Define the platform topology**  
  As an architect, I want a structured view of frontend, backend, data stores, and auxiliary services so I can evaluate impact of changes.  
  **Acceptance Criteria:** Documentation lists S3-hosted frontend, EC2 backend (port 4000 via nginx 80), Kiro API (8081), terminal server (8080), DynamoDB tables (`stories`, `acceptance-tests`), and legacy Lambda/API Gateway presence.
  - **Story 1.1.1: Document environment endpoints**  
    As an operator, I need production and development endpoint URLs documented so I can verify deployments.  
    **Acceptance Criteria:** Production backend/frontend URLs (44.220.45.57, `aipm-static-hosting-demo` S3) and development backend/frontend URLs (44.222.168.46, `aipm-dev-frontend-hosting` S3) are explicitly listed.
  - **Story 1.1.2: Capture legacy compatibility**  
    As a platform owner, I need Lambda/serverless compatibility documented so I can decide on cleanup or rollback.  
    **Acceptance Criteria:** `handler.mjs` usage via `@vendia/serverless-express` is described; note that EC2 is primary and Lambda is deprecated but functional.
  - **Story 1.1.3: Catalog platform services**  
    As a platform maintainer, I need auxiliary services cataloged so I can manage uptime.  
    **Acceptance Criteria:** Documentation includes Kiro API server, terminal server, PR metadata helpers, and systemd/nginx dependencies.

## Root Story 2: Product Capabilities (Backend + Data + Integrations)
- **Story 2.1: Deliver core backend capabilities**  
  As a backend engineer, I want the API and data layer to support end-to-end story management.  
  **Acceptance Criteria:** Documentation enumerates required endpoints, data models, and storage behavior for stories, tests, and uploads.
  - **Story 2.1.1: Story CRUD with INVEST enforcement**  
    As a backend engineer, I want REST endpoints for stories with INVEST validation so I can manage backlog items.  
    **Acceptance Criteria:** `GET/POST /api/stories`, `PUT /api/stories/{id}`, `POST /api/stories/draft`, `GET /api/stories/restore`, `POST /api/stories/backup` are documented with required fields, INVEST warnings (409), and override via `acceptWarnings`.
  - **Story 2.1.2: Acceptance test linkage**  
    As a backend engineer, I need acceptance tests tied to stories and retrievable efficiently.  
    **Acceptance Criteria:** DynamoDB `acceptance-tests` table uses PK `id` and GSI `storyId-index`; story responses include acceptance tests; automatic acceptance test generation after story creation is described.
  - **Story 2.1.3: File uploads for reference documents**  
    As a user, I need to upload reference documents.  
    **Acceptance Criteria:** `POST /api/uploads` stores files under `apps/frontend/public/uploads/`; `GET /uploads/<filename>` serves them; size/location expectations documented.
  - **Story 2.1.4: GitHub automation endpoints**  
    As a release engineer, I want endpoints to create PRs and trigger deployments.  
    **Acceptance Criteria:** `POST /api/create-pr`, `/api/personal-delegate`, `/api/deploy-pr`, `/api/merge-pr`, `/api/trigger-deployment`, `/api/personal-delegate/status` are listed with required `GITHUB_TOKEN`, owner/repo defaults, and expected responses.
  - **Story 2.1.5: Health/config endpoints**  
    As an operator, I need liveness and configuration probes.  
    **Acceptance Criteria:** `/health`, `/api/version`, `/api/config/endpoints`, `/api/github-status`, `/api/system/aws-status`, `/api/system/git-status`, `/api/system/shell-status` behaviors and outputs are specified.
  - **Story 2.1.6: Data model parity**  
    As a data engineer, I need DynamoDB fields mapped to legacy SQLite shapes.  
    **Acceptance Criteria:** Stories table attributes include snake_case and camelCase fields (title, description, as_a/asA, i_want/iWant, so_that/soThat, components JSON, story_point, assignee_email, status, parent_id, invest_warnings, invest_analysis, prs) with numeric `id` PK; acceptance-tests table attributes include storyId, given/when_step/then_step, status, timestamps.

## Root Story 3: User Experience & Frontend Workflows
- **Story 3.1: Enable end-user workflows**  
  As a product user, I want a cohesive UI that lets me browse, edit, and validate stories.  
  **Acceptance Criteria:** UI behaviors cover synchronized panels, mindmap layout control, modals, and detailed story views.
  - **Story 3.1.1: Panel synchronization**  
    As a product user, I want outline, mindmap, and detail panels to stay in sync.  
    **Acceptance Criteria:** Selecting a node updates all panels; ancestor expansion ensures visibility; right-growing mindmap renders with status styling.
  - **Story 3.1.2: Mindmap layout control**  
    As a user, I can toggle auto-layout and persist manual positions.  
    **Acceptance Criteria:** Auto-layout toggle exists; manual drag positions persist via `/api/mindmap/persist` and localStorage; state restores on reload.
  - **Story 3.1.3: Modal workflows**  
    As a user, I want modals for child stories, acceptance tests, reference documents, and uploads with validation and override options.  
    **Acceptance Criteria:** Each modal enforces required fields; INVEST/verifiability warnings allow override after confirmation; modals block background scroll and restore focus.
  - **Story 3.1.4: Story detail richness**  
    As a user, I want INVEST feedback, tasks, dependencies, and reference documents visible in the detail panel.  
    **Acceptance Criteria:** Detail view shows INVEST warnings/health, acceptance tests, tasks with assignee enforcement, dependencies/dependents, components, status, story points, assignee email.
  - **Story 3.1.5: Employee Heat Map**  
    As a manager, I want workload visualization per assignee/component.  
    **Acceptance Criteria:** Heat map modal exists with assignee filter; columns for system components; percentages total 100% per person with color intensity indicating load.
  - **Story 3.1.6: Export and document generation**  
    As a PM, I need export/generation controls available.  
    **Acceptance Criteria:** Export button/modal present; Generate Document feature available with fallback when ChatGPT unavailable.

## Root Story 4: Delivery Operations & Automation (Setup, Testing, Deployment, Security, AI)
- **Story 4.1: Operate and deliver the platform**  
  As a delivery lead, I need the operational practices documented so the platform can be deployed, tested, and secured consistently.  
  **Acceptance Criteria:** Documentation covers setup, testing, deployment, security, monitoring, and automation workflows.
  - **Story 4.1.1: Local bootstrap**  
    As a developer, I want to start the stack locally quickly.  
    **Acceptance Criteria:** `npm install` works; `node apps/backend/server.js` serves backend+frontend on 4000 (fallback if busy); static assets are served from `apps/frontend/public`.
  - **Story 4.1.2: Env vars reference**  
    As a developer, I need a definitive env var list.  
    **Acceptance Criteria:** Core vars (`STAGE`, `AWS_REGION`, `STORIES_TABLE`, `ACCEPTANCE_TESTS_TABLE`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `EC2_PR_PROCESSOR_URL`, `PR_NUMBER`) and AI vars (`AI_PM_OPENAI_API_KEY`, `AI_PM_OPENAI_API_URL`, `AI_PM_OPENAI_MODEL`, `AI_PM_DISABLE_OPENAI`) are documented with defaults.
  - **Story 4.1.3: AWS/IAM setup**  
    As DevOps, I need required permissions stated.  
    **Acceptance Criteria:** DynamoDB CRUD, CloudWatch Logs (Lambda), S3 read/write for frontend deploy, EC2 instance roles, and SSM `/aipm/github-token` are documented.
  - **Story 4.1.4: Gating suites**  
    As QA, I need scripted gating tests for releases.  
    **Acceptance Criteria:** Phase scripts (`phase1-security-data-safety.sh` through `phase4-workflow-validation.sh`) and orchestrators (`run-workflow-gating-tests.sh`, `run-structured-gating-tests.sh`) are listed with scope (security, performance, infrastructure, workflow). `npm test` is documented to call `scripts/testing/run-all-gating-tests.sh` if present.
  - **Story 4.1.5: Browser validation**  
    As QA, I need environment-specific browser tests.  
    **Acceptance Criteria:** Gating HTML pages in `apps/frontend/public/*gating-tests*.html` for prod/dev are documented with URLs.
  - **Story 4.1.6: Deployment playbooks**  
    As DevOps, I need repeatable prod and dev deployment steps.  
    **Acceptance Criteria:** Scripts `scripts/deployment/deploy-prod-full.sh` and `deploy-dev-ec2.sh` (plus variants) are referenced; validation via `curl` to root and `/api/stories` on prod/dev endpoints; `deploy-config.yaml` governs stage/region/bucket.
  - **Story 4.1.7: CI/CD workflows**  
    As a release engineer, I want GitHub Actions coverage.  
    **Acceptance Criteria:** `.github/workflows/deploy-pr-to-dev.yml` for PRs and `deploy-to-prod.yml` for production are referenced with required secrets.
  - **Story 4.1.8: Security & compliance**  
    As a security lead, I want safe token and config handling.  
    **Acceptance Criteria:** PAT stored in SSM `/aipm/github-token` for Lambda and env vars for EC2/dev; `config-dev.js`, `config-prod.js`, `config.js` never contain secrets; inbound ports restricted to 80/443/8080/8081; data protection guidance avoids sensitive PII in stories/uploads.
  - **Story 4.1.9: Monitoring & troubleshooting**  
    As SRE/support, I need guidance for operational monitoring and common fixes.  
    **Acceptance Criteria:** `/health`, `/api/version`, `/api/github-status` used as probes; logging guidance references systemd/journal and CloudWatch; troubleshooting includes offline banner config fix, INVEST conflict handling, GitHub token issues, and DynamoDB IAM/index checks.

  - **Story 4.1.10: PR creation/assignment**  
    As a developer, I need automated PR creation tied to stories.  
    **Acceptance Criteria:** Use `/api/create-pr` or `/api/personal-delegate`; outputs include PR number/URL, branch name, confirmation code; story linkage stored.
  - **Story 4.1.11: Deployment dispatch**  
    As a release engineer, I want to trigger dev deployments from the backend.  
    **Acceptance Criteria:** `/api/trigger-deployment` dispatches `deploy-pr-to-dev.yml` with PR number input; success/failure messages captured.
  - **Story 4.1.12: Code generation workflow**  
    As a developer, I want Kiro-driven code generation to create PR-ready changes.  
    **Acceptance Criteria:** Task flow (create PR branch → enqueue task → worker runs `kiro-cli chat` → commits/pushes → callbacks to `/api/kiro/callback`) is described with credential requirements.
  - **Story 4.1.13: GitHub API usage**  
    As an integrator, I need specifics of GitHub API use.  
    **Acceptance Criteria:** Repo default branch lookup, branch creation, optional placeholder file creation, PR creation, issue comments, workflow dispatch; retry/backoff rules documented.
  - **Story 4.1.14: Kiro CLI/API integration**  
    As an integrator, I need Kiro interaction documented.  
    **Acceptance Criteria:** Kiro API ports, worker scripts, queue (`aipm-amazon-q-queue`), authentication requirements, and callback endpoint `/api/kiro/callback` are listed.
  - **Story 4.1.15: Long-term operations**  
    As an ops lead, I need lifecycle guidance for scaling and recovery.  
    **Acceptance Criteria:** Routine maintenance (token rotation, upload pruning), capacity planning (EC2/DynamoDB scaling), and disaster recovery (DynamoDB backups, redeploy from `deploy-config.yaml`/`serverless.yml`) are documented.
