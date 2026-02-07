# Requirements-to-Code Mapping

This table maps each user story ID to the primary modules/files that implement it, the current implementation status, and short evidence notes (routes, functions, templates, or scripts).

| Story ID | Title | Module/File(s) | Status | Evidence |
| --- | --- | --- | --- | --- |
| US-0101 | Create story | apps/backend/app.js<br>apps/backend/dynamodb.js<br>apps/frontend/public/app.js | Implemented | POST `/api/stories` handler; `DynamoDBDataLayer.createStory`; frontend story creation flow. |
| US-0102 | Edit story | apps/backend/app.js<br>apps/backend/dynamodb.js<br>apps/frontend/public/app.js | Implemented | PATCH/PUT `/api/stories/:id` handler; `DynamoDBDataLayer.updateStory`; frontend edit + save. |
| US-0103 | Delete story | apps/backend/app.js<br>apps/backend/dynamodb.js<br>apps/frontend/public/app.js | Implemented | DELETE `/api/stories/:id` handler; `DynamoDBDataLayer.deleteStory`. |
| US-0104 | Story status transitions | apps/backend/app.js<br>apps/frontend/public/app.js | Partial | Status normalization + Done validation (child stories/tests) and UI status updates; explicit transition rules are limited. |
| US-0111 | Parent/child linkage | apps/backend/app.js<br>apps/backend/dynamodb.js<br>apps/frontend/public/app.js | Implemented | `parent_id`/`parentId` fields persisted and used for hierarchy rendering. |
| US-0112 | Hierarchical query | apps/backend/app.js<br>apps/backend/dynamodb.js<br>apps/frontend/public/app.js | Implemented | Story list returns `parentId` to rebuild the tree deterministically. |
| US-0121 | Components tagging | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | `components` stored on stories and used in filters/details. |
| US-0122 | Override controls | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | `acceptWarnings` override for INVEST/GWT validation in create/update flows. |
| US-0801 | Consistent schema enforcement | apps/backend/app.js | Implemented | Request validation with required fields/type checks (e.g., title/storyPoint/GWT). |
| US-0811 | DynamoDB backup export procedure | apps/backend/app.js | Implemented | POST `/api/stories/backup` endpoint for exporting story data. |
| US-0301 | Three-panel workspace | apps/frontend/public/index.html<br>apps/frontend/public/app.js | Implemented | Outline/Mindmap/Details panels in workspace layout. |
| US-0302 | Restore UI state | apps/frontend/public/app.js | Implemented | LocalStorage-backed restoration for panels, layout, filters, and selection. |
| US-0311 | Render mindmap nodes | apps/frontend/public/app.js | Implemented | Mindmap canvas rendering and node drawing logic. |
| US-0312 | Navigate via mindmap | apps/frontend/public/app.js | Implemented | Mindmap node selection updates details/outline state. |
| US-0321 | Story creation modal | apps/frontend/public/index.html<br>apps/frontend/public/app.js | Missing | No dedicated story creation modal markup/logic present (only PR/task modals). |
| US-0322 | Modal accessibility and close controls | apps/frontend/public/index.html<br>apps/frontend/public/app.js | Missing | No story creation modal or close-control logic to validate. |
| US-0201 | Create acceptance test | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | POST `/api/stories/:id/tests` / acceptance-test creation flows. |
| US-0202 | Update acceptance test | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | PATCH `/api/acceptance-tests/:id` updates Given/When/Then/status. |
| US-0203 | Delete acceptance test | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | DELETE `/api/acceptance-tests/:id` removes tests. |
| US-0211 | Done validation | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | Done status guarded by child story + acceptance test pass checks. |
| US-0401 | Run heuristic INVEST validation on save | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | Heuristic INVEST checks run on story create/update with warnings surfaced in UI. |
| US-0411 | AI-based INVEST analysis (optional) | apps/backend/app.js<br>semantic-api/templates/POST-aipm-invest-analysis.md<br>apps/frontend/public/app.js | Implemented | `/aipm/invest-analysis` calls with SSE stream + template-driven analysis. |
| US-0412 | Disable AI safely | apps/backend/app.js | Partial | AI analysis errors are caught and heuristic/fallback messaging is used. |
| US-0501 | GitHub status endpoint | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | GET `/api/github-status` and UI status checks. |
| US-0511 | Create PR from story | apps/backend/app.js<br>apps/backend/server.js<br>apps/frontend/public/app.js | Implemented | PR creation endpoints and UI flow for PR creation. |
| US-0512 | PR description from story fields | apps/backend/server.js | Implemented | `buildPRBody` uses story fields/acceptance criteria. |
| US-0521 | Merge PR from AIPM | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | POST `/api/merge-pr` and merge button workflow. |
| US-0601 | Enqueue code-generation task | apps/backend/app.js<br>apps/frontend/public/app.js | Partial | Task creation + code generation kick-off; relies on external Kiro API. |
| US-0611 | Process queued tasks via Kiro API | apps/backend/app.js<br>apps/frontend/public/app.js | Partial | SSE-based code generation queue processing with external Kiro API. |
| US-0621 | Enforce code-generation template | apps/backend/app.js<br>semantic-api/templates/POST-aipm-code-generation.md | Implemented | Code generation uses Semantic API endpoint + template. |
| US-0001 | Local dev boot | README.md | Implemented | Local dev instructions (`npm install`, `npm run dev`). |
| US-0002 | Stage-aware configuration | config/environments.yaml<br>apps/backend/config.js<br>apps/frontend/public/config.js | Implemented | Environment-aware config loader reads `environments.yaml`. |
| US-0003 | Health endpoint | apps/backend/app.js | Implemented | GET `/health` endpoint returns API status. |
| US-1001 | Structured server logging | apps/backend/app.js | Partial | Console logging for key workflows; not fully structured JSON logging. |
| US-1011 | Deployment result surfaced to users | apps/frontend/public/app.js<br>apps/backend/app.js | Partial | Deployment trigger/status UI with backend endpoints for deploy events. |
| US-0701 | Run structured gating tests script | scripts/testing/run-structured-gating-tests.sh | Implemented | Script orchestrates multi-phase gating tests. |
| US-0702 | Phase coverage: Security/Data Safety | scripts/testing/run-structured-gating-tests.sh | Partial | Phase coverage exists; security/data-safety coverage not explicitly enumerated. |
| US-0711 | “Test in Dev” deployment trigger | apps/backend/app.js<br>apps/frontend/public/app.js | Implemented | `/api/trigger-deployment` and deploy-to-dev workflow trigger UI. |
| US-0721 | Automatic production deployment on main | .github/workflows/deploy-to-prod.yml | Implemented | Workflow triggers on main branch pushes. |
| US-0731 | Unified deploy-to-environment script | bin/deploy-prod | Implemented | `bin/deploy-prod <prod|dev>` drives deploy by environment. |
| US-0901 | Never store secrets in code | docs/RULES.md | Missing | No explicit repo-wide secret-handling policy documented. |
| US-0911 | Basic API access control policy | apps/backend/app.js | Missing | API routes do not enforce auth/authorization. |
| US-1101 | Keep the dev guide accurate | docs/DEVELOPMENT.md | Implemented | Development guide maintained in docs. |
| US-1111 | Emergency deploy and rollback runbook | docs/DEVELOPMENT.md | Implemented | Rollback procedures and emergency actions documented. |
