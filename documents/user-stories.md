Root 1 — Work Model and Data (Core Product)
1.1 Story model and lifecycle

US-0101 — Create story

As a project user

I want to create a story with a title and structured intent (As-a / I-want / So-that)

So that work items are consistent and traceable from intent to delivery

Acceptance (GWT)

Given I am in the AIPM workspace

When I submit a new story with required fields

Then the story is persisted and returned with an id and timestamps

And it appears in the outline and details views

US-0102 — Edit story

As a project user

I want to update a story’s fields (title, description, intent fields, status, metadata)

So that the artifact reflects the latest shared understanding

Acceptance (GWT)

Given a story exists

When I save edits

Then the persisted story reflects the updated fields

And updatedAt is refreshed and UI renders the changes

US-0103 — Delete story

As a project owner

I want to delete a story

So that obsolete or invalid work items do not clutter planning and execution

Acceptance (GWT)

Given a story exists

When I delete the story

Then it is removed from storage

And it no longer appears in story list queries or UI navigation

US-0104 — Story status transitions

As a project user

I want stories to move through defined states (e.g., Draft → Ready → In Progress → Approved → Done, plus Blocked)

So that progress is measurable and governance is consistent

Acceptance (GWT)

Given a story is in a valid state

When I request a state change

Then the backend enforces allowed transitions (or returns a clear error)

And the new status is reflected consistently across UI and APIs

1.2 Hierarchy and structuring

US-0111 — Parent/child linkage

As a project user

I want to link stories using parentId to form a hierarchy

So that epics/features/stories can be represented as a navigable tree

Acceptance (GWT)

Given a parent story exists

When I create or update a story with parentId=parent.id

Then the child is associated to the parent

And outline ordering shows the child beneath the parent

US-0112 — Hierarchical query

As a frontend client

I want to retrieve stories in a way that supports efficient tree reconstruction

So that large work models render quickly without expensive client-side joins

Acceptance (GWT)

Given multiple stories with parent-child relationships exist

When I request stories from the API

Then each story includes id and parentId (when applicable)

And the result set is sufficient to rebuild the hierarchy deterministically

1.3 Metadata and governance flags

US-0121 — Components tagging

As a tech lead

I want to tag stories with component/domain labels (e.g., WorkModel, UI, GitHubIntegration, CI/CD)

So that ownership, filtering, and reporting are simpler

Acceptance (GWT)

Given a story exists

When I assign one or more component tags

Then tags are persisted and returned by the API

And the UI can filter/search by these tags

US-0122 — Override controls

As a project owner

I want explicit override controls (e.g., accept warnings, bypass specific validations)

So that exceptions are intentional and auditable rather than accidental

Acceptance (GWT)

Given a story fails a non-critical validation (warning)

When I set an override flag and proceed

Then the system allows progression while preserving the warning record

And the override is visible in story details for review

1.4 Schema and integrity

US-0801 — Consistent schema enforcement

As a system operator

I want backend validation that rejects malformed story/test payloads

So that UI, integrations, and automations are protected from corrupt data

Acceptance (GWT)

Given a request is missing required fields or uses invalid types

When it is submitted to the API

Then the API rejects it with a clear validation error

And no partial/invalid data is persisted

US-0811 — DynamoDB backup export procedure

As a system operator

I want a defined, testable export/backup procedure for core tables

So that restoration is feasible after incidents or migration needs

Acceptance (GWT)

Given production or dev data exists in the tables

When I run the backup procedure

Then I obtain export artifacts containing all items for the selected scope

And restoration steps are documented and verifiable

Root 2 — User Experience and Collaboration (Frontend Product)
2.1 Workspace layout and state

US-0301 — Three-panel workspace

As a user

I want an integrated workspace with outline, mindmap, and details panels

So that I can navigate structure and edit content without context switching

Acceptance (GWT)

Given the app is loaded

When I show/hide panels

Then the layout updates immediately without losing the selected story context

And the details panel always reflects the currently selected story

US-0302 — Restore UI state

As a returning user

I want the app to restore my last-used UI configuration (panel toggles/selection)

So that I can continue where I left off

Acceptance (GWT)

Given I previously used a specific workspace configuration

When I reload the application

Then the UI restores the saved configuration

And the selection state is consistent (or gracefully falls back if unavailable)

2.2 Mindmap visualization and navigation

US-0311 — Render mindmap nodes

As a user

I want stories rendered as a mindmap (nodes/edges) derived from hierarchy

So that I can visually understand scope and dependencies

Acceptance (GWT)

Given a set of hierarchical stories exists

When I open mindmap view

Then nodes render with readable labels

And parent-child relationships appear as edges

US-0312 — Navigate via mindmap

As a user

I want selecting a mindmap node to open that story in the details panel

So that navigation is fast and intuitive

Acceptance (GWT)

Given the mindmap is visible

When I click a node

Then the details panel shows that story

And outline selection is synchronized (same story highlighted)

2.3 Editing interaction patterns

US-0321 — Story creation modal

As a user

I want a modal-based story creation flow (optionally as a child of the selected story)

So that I can add work items without leaving my current context

Acceptance (GWT)

Given I am viewing a story in details

When I choose “Add child story”

Then the create modal opens with parentId pre-populated

And upon save, the new story appears under the parent immediately

US-0322 — Modal accessibility and close controls

As a user

I want modals to behave predictably (Escape/backdrop/close button, focus handling)

So that editing is efficient and accessible

Acceptance (GWT)

Given a modal is open

When I press Escape or click the close control

Then the modal closes without losing previously saved data

And focus returns to a sensible UI element (e.g., the triggering control)

Root 3 — Quality and Governance (ATDD + Readiness)
3.1 Acceptance tests as first-class artifacts

US-0201 — Create acceptance test

As a QA/SDET

I want to create acceptance tests linked to a story using Given/When/Then steps

So that requirements are testable and support ATDD workflows

Acceptance (GWT)

Given a story exists

When I create an acceptance test with GWT steps and storyId

Then the acceptance test is persisted and retrievable by storyId

And the story details show linked tests

US-0202 — Update acceptance test

As a QA/SDET

I want to edit acceptance test steps and metadata

So that tests stay aligned with evolving requirements

Acceptance (GWT)

Given an acceptance test exists

When I update the GWT steps

Then the updated content is persisted and returned

And updatedAt reflects the edit

US-0203 — Delete acceptance test

As a QA/SDET

I want to delete acceptance tests linked to stories

So that obsolete tests do not confuse gating and traceability

Acceptance (GWT)

Given an acceptance test exists

When I delete it

Then it no longer appears in queries or story details

And story gating logic reflects the updated test set

3.2 Definition of Done and promotion gates

US-0211 — Done validation

As a project owner

I want rules that validate “Done” (e.g., required acceptance tests exist; optionally passing evidence is present)

So that “Done” is consistent and not subjective

Acceptance (GWT)

Given a story has zero acceptance tests (or fails required gating conditions)

When I attempt to set status to Done

Then the system blocks the transition or raises a warning per policy

And it clearly reports which rule(s) were not satisfied

3.3 Story quality validation (INVEST)

US-0401 — Run heuristic INVEST validation on save

As a project user

I want heuristic INVEST feedback when saving a story

So that story quality improves before implementation starts

Acceptance (GWT)

Given I save a story

When the system evaluates INVEST heuristics

Then warnings/suggestions are stored and displayed in the UI

And warnings do not prevent saving unless configured as blocking

US-0411 — AI-based INVEST analysis (optional)

As a project owner

I want optional AI-assisted INVEST analysis controlled by configuration

So that teams can enable deeper guidance without making AI mandatory

Acceptance (GWT)

Given AI is enabled via environment configuration

When I request or trigger AI INVEST analysis

Then an analysis result is returned and associated to the story

And the result indicates it was AI-generated (source attribution)

US-0412 — Disable AI safely

As a system operator

I want a configuration switch to disable AI calls (e.g., AI_PM_DISABLE_OPENAI=1)

So that the system remains stable in restricted or offline environments

Acceptance (GWT)

Given AI is disabled

When AI analysis is requested

Then the system responds gracefully (clear “AI disabled” outcome)

And no external AI calls are attempted

Root 4 — Automation and Integrations (GitHub + AI Agents)
4.1 GitHub connectivity and trust checks

US-0501 — GitHub status endpoint

As a system operator

I want an endpoint to validate GitHub token presence and permissions

So that PR automation fails early with actionable diagnostics

Acceptance (GWT)

Given the system is configured (or misconfigured) with a GitHub token

When I call the GitHub status endpoint

Then the response clearly indicates valid/invalid and includes permission diagnostics

And the endpoint never returns or logs the token value

4.2 PR workflows linked to intent

US-0511 — Create PR from story

As a developer

I want to create a GitHub PR from a story from within AIPM

So that implementation work is traceable to the approved intent

Acceptance (GWT)

Given a story is Ready (or otherwise eligible)

When I request PR creation

Then AIPM creates a PR in the configured repo and stores PR metadata on the story

And the PR includes a specification artifact (e.g., TASK.md) derived from the story

US-0512 — PR description from story fields

As a reviewer

I want PR title/body to include structured story intent and acceptance context

So that reviews are aligned to requirements rather than ad hoc code changes

Acceptance (GWT)

Given PR creation is triggered from a story

When the PR is created

Then the PR body contains the story’s As-a/I-want/So-that and key acceptance criteria references

And the formatting is consistent across PRs

US-0521 — Merge PR from AIPM

As a maintainer

I want to request PR merge via AIPM (subject to checks/policy)

So that execution can be driven from a single system of record

Acceptance (GWT)

Given a PR exists and required checks are satisfied (per policy)

When I request merge from AIPM

Then AIPM attempts merge and updates PR status on the story

And failures return actionable messages (e.g., checks failing, conflicts)

4.3 Agent execution (Kiro queue + processing)

US-0601 — Enqueue code-generation task

As a developer

I want AIPM to enqueue a code-generation task linked to story + PR

So that AI code generation is decoupled, asynchronous, and auditable

Acceptance (GWT)

Given a story has an associated PR

When I request “Generate Code”

Then a task record is persisted in the queue with references to storyId and PR branch

And the UI shows the queued state

US-0611 — Process queued tasks via Kiro API

As a system operator

I want the Kiro API server to consume queued tasks and push code to the PR branch

So that code changes are produced automatically and attached to the correct PR

Acceptance (GWT)

Given a queued task exists

When the Kiro API server processes the task

Then code is generated/updated on the PR branch and committed

And task status is updated with success/failure and relevant logs/links

US-0621 — Enforce code-generation template

As a tech lead

I want code generation to follow the standard workflow template (checkout/rebase/analyze/implement/add gating tests/commit/push)

So that AI-generated changes are predictable and reviewable

Acceptance (GWT)

Given a code-generation task is executed

When the agent runs

Then the workflow follows the prescribed steps and produces a structured output

And gating tests are added/updated as part of the change when required by the story

Root 5 — Delivery and Operations (CI/CD + Runtime)
5.1 Environment boot and configuration

US-0001 — Local dev boot

As a developer

I want to start AIPM locally with a single command and verify UI + API are reachable

So that development iteration is fast and reliable

Acceptance (GWT)

Given environment variables are set for tables and GitHub token (as needed)

When I start the service

Then the server starts on port 4000 (or next available) and serves UI + API successfully

And the health endpoint reports running

US-0002 — Stage-aware configuration

As a DevOps engineer

I want STAGE=dev|prod to select environment-specific resources (tables, endpoints, deployment targets)

So that dev and prod are isolated and safe

Acceptance (GWT)

Given STAGE=dev

When the backend starts and handles requests

Then it reads/writes to dev resources (dev tables / dev endpoints)

And it never writes into prod resources unless explicitly configured

5.2 Service readiness and observability

US-0003 — Health endpoint

As a system operator

I want a health endpoint that confirms service readiness

So that deployments and monitoring can verify correctness quickly

Acceptance (GWT)

Given the backend is running

When /health is called

Then it returns a success status and basic service info

And failures are clearly surfaced when dependencies are unavailable

US-1001 — Structured server logging

As a system operator

I want structured logs for key workflows (story CRUD, PR creation, deployment triggers, AI requests)

So that troubleshooting is efficient and auditable

Acceptance (GWT)

Given a request is handled by the backend

When it succeeds or fails

Then logs include request context (endpoint/action, correlation id if used, outcome)

And logs never include secrets (tokens/keys)

US-1011 — Deployment result surfaced to users

As a developer

I want deployment outcomes visible (e.g., PR comment and/or UI status)

So that I can quickly determine whether dev validation succeeded

Acceptance (GWT)

Given a deployment is triggered from AIPM or CI

When the workflow completes

Then the result (success/failure) is surfaced with a concise summary and relevant links (health/test logs)

5.3 CI gating and deployments

US-0701 — Run structured gating tests script

As a CI system

I want a standardized gating test runner with phased checks

So that releases are blocked on critical safety/quality conditions

Acceptance (GWT)

Given a commit or PR is being validated

When gating tests run

Then tests execute by phases and report pass/fail per phase

And critical failures block progression

US-0702 — Phase coverage: Security/Data Safety

As a security-conscious operator

I want Phase 1 gating to validate security and data safety prerequisites (e.g., token/AWS/table integrity constraints)

So that deployments do not proceed with unsafe configuration

Acceptance (GWT)

Given required security prerequisites are missing or invalid

When Phase 1 runs

Then it fails fast with actionable remediation guidance

And later phases do not execute

US-0711 — “Test in Dev” deployment trigger

As a developer

I want to deploy a PR branch to the dev environment via a controlled workflow

So that changes are validated before merging to main

Acceptance (GWT)

Given a PR exists

When I trigger “Test in Dev”

Then CI deploys the PR branch to dev, runs validation, and records results

And AIPM/PR shows the deployment result

US-0721 — Automatic production deployment on main

As a release manager

I want merges/pushes to main to run gating tests and deploy to production automatically

So that production remains current with controlled quality gates

Acceptance (GWT)

Given a change is merged into main

When the production pipeline runs

Then gating tests execute and production deploy is performed if gates pass

And production health verification is performed post-deploy

US-0731 — Unified deploy-to-environment script

As a DevOps engineer

I want a unified deployment script (dev|prod) used consistently by CI and humans

So that deployment behavior is predictable and repeatable

Acceptance (GWT)

Given a target environment is specified

When the deploy script runs

Then it deploys frontend and backend to the correct targets for that stage

And it provides clear success/failure output and a verification step (health)

5.4 Security baseline

US-0901 — Never store secrets in code

As a security reviewer

I want all secrets (GitHub token, AI keys, AWS credentials if any) to be provided via environment/secret managers only

So that secrets are not leaked in repository history or logs

Acceptance (GWT)

Given the system is running

When I inspect code and logs

Then secrets are not hardcoded or printed

And missing secrets yield clear configuration errors without disclosure

US-0911 — Basic API access control policy

As a system owner

I want an explicit baseline access control policy for the API (even if minimal initially)

So that production hardening is trackable and auditable

Acceptance (GWT)

Given production is deployed

When unauthenticated or disallowed requests are made (per configured policy)

Then the system responds according to policy (deny/allow with constraints)

And the policy is documented and testable

5.5 Documentation and runbooks

US-1101 — Keep the dev guide accurate

As a new contributor

I want documentation that accurately reflects setup, environment variables, local run, and test commands

So that onboarding is fast and consistent

Acceptance (GWT)

Given a clean environment and repository checkout

When I follow the documentation end-to-end

Then I can run the app locally and execute gating tests successfully

And any prerequisites are explicitly stated

US-1111 — Emergency deploy and rollback runbook

As a system operator

I want an emergency runbook for deploy/rollback procedures

So that incidents can be mitigated quickly and safely

Acceptance (GWT)

Given a production incident requires rollback

When I follow the runbook steps

Then the system returns to a known-good version and passes health verification

And the procedure records what changed and how it was validated
