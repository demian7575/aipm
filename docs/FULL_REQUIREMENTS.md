# AIPM Full Requirements (Implemented Stories Only)

This document lists only the **verified Implemented** user stories, organized under the approved **6-root hierarchy**. Stories are sourced from the existing catalog and verified against implementation evidence.

Hierarchy depth follows the **5-level** structure defined in the current hierarchy plan, with implemented stories populated through Level 3 (leaf stories). This stays within the requested maximum depth of 7 levels.

- **Level 1**: Root domains (e.g., Requirement Management)
- **Level 2**: Major capability groups (e.g., Story Lifecycle)
- **Level 3**: Implemented leaf stories (US-xxxx)
- **Level 4**: Not currently populated by implemented stories
- **Level 5**: Not currently populated by implemented stories

---

## Level 1 — Root 1: Requirement Management

### Level 2 — 1100 Story Lifecycle

#### Level 3 — US-0101 Create story

As a project user

I want to create a story with a title and structured intent (As-a / I-want / So-that)

So that work items are consistent and traceable from intent to delivery

Acceptance (GWT)

Given I am in the AIPM workspace

When I submit a new story with required fields

Then the story is persisted and returned with an id and timestamps

And it appears in the outline and details views

#### Level 3 — US-0102 Edit story

As a project user

I want to update a story’s fields (title, description, intent fields, status, metadata)

So that the artifact reflects the latest shared understanding

Acceptance (GWT)

Given a story exists

When I save edits

Then the persisted story reflects the updated fields

And updatedAt is refreshed and UI renders the changes

#### Level 3 — US-0103 Delete story

As a project owner

I want to delete a story

So that obsolete or invalid work items do not clutter planning and execution

Acceptance (GWT)

Given a story exists

When I delete the story

Then it is removed from storage

And it no longer appears in story list queries or UI navigation

### Level 2 — 1200 Story Hierarchy & Relationships

#### Level 3 — US-0111 Parent/child linkage

As a project user

I want to link stories using parentId to form a hierarchy

So that epics/features/stories can be represented as a navigable tree

Acceptance (GWT)

Given a parent story exists

When I create or update a story with parentId=parent.id

Then the child is associated to the parent

And outline ordering shows the child beneath the parent

#### Level 3 — US-0112 Hierarchical query

As a frontend client

I want to retrieve stories in a way that supports efficient tree reconstruction

So that large work models render quickly without expensive client-side joins

Acceptance (GWT)

Given multiple stories with parent-child relationships exist

When I request stories from the API

Then each story includes id and parentId (when applicable)

And the result set is sufficient to rebuild the hierarchy deterministically

### Level 2 — 1300 Story Metadata & Attributes

#### Level 3 — US-0121 Components tagging

As a tech lead

I want to tag stories with component/domain labels (e.g., WorkModel, UI, GitHubIntegration, CI/CD)

So that ownership, filtering, and reporting are simpler

Acceptance (GWT)

Given a story exists

When I assign one or more component tags

Then tags are persisted and returned by the API

And the UI can filter/search by these tags

### Level 2 — 1400 Story Validation & Quality

#### Level 3 — US-0122 Override controls

As a project owner

I want explicit override controls (e.g., accept warnings, bypass specific validations)

So that exceptions are intentional and auditable rather than accidental

Acceptance (GWT)

Given a story fails a non-critical validation (warning)

When I set an override flag and proceed

Then the system allows progression while preserving the warning record

And the override is visible in story details for review

#### Level 3 — US-0801 Consistent schema enforcement

As a system operator

I want backend validation that rejects malformed story/test payloads

So that UI, integrations, and automations are protected from corrupt data

Acceptance (GWT)

Given a request is missing required fields or uses invalid types

When it is submitted to the API

Then the API rejects it with a clear validation error

And no partial/invalid data is persisted

#### Level 3 — US-0401 Run heuristic INVEST validation on save

As a project user

I want heuristic INVEST feedback when saving a story

So that story quality improves before implementation starts

Acceptance (GWT)

Given I save a story

When the system evaluates INVEST heuristics

Then warnings/suggestions are stored and displayed in the UI

And warnings do not prevent saving unless configured as blocking

---

## Level 1 — Root 2: Document Management

### Level 2 — 2300 Import & Export

#### Level 3 — US-0811 DynamoDB backup export procedure

As a system operator

I want a defined, testable export/backup procedure for core tables

So that restoration is feasible after incidents or migration needs

Acceptance (GWT)

Given production or dev data exists in the tables

When I run the backup procedure

Then I obtain export artifacts containing all items for the selected scope

And restoration steps are documented and verifiable

---

## Level 1 — Root 3: Visualization & Interaction

### Level 2 — 3300 View Switching & Layout

#### Level 3 — US-0301 Three-panel workspace

As a user

I want an integrated workspace with outline, mindmap, and details panels

So that I can navigate structure and edit content without context switching

Acceptance (GWT)

Given the app is loaded

When I show/hide panels

Then the layout updates immediately without losing the selected story context

And the details panel always reflects the currently selected story

#### Level 3 — US-0302 Restore UI state

As a returning user

I want the app to restore my last-used UI configuration (panel toggles/selection)

So that I can continue where I left off

Acceptance (GWT)

Given I previously used a specific workspace configuration

When I reload the application

Then the UI restores the saved configuration

And the selection state is consistent (or gracefully falls back if unavailable)

### Level 2 — 3100 Mindmap View

#### Level 3 — US-0311 Render mindmap nodes

As a user

I want stories rendered as a mindmap (nodes/edges) derived from hierarchy

So that I can visually understand scope and dependencies

Acceptance (GWT)

Given a set of hierarchical stories exists

When I open mindmap view

Then nodes render with readable labels

And parent-child relationships appear as edges

#### Level 3 — US-0312 Navigate via mindmap

As a user

I want selecting a mindmap node to open that story in the details panel

So that navigation is fast and intuitive

Acceptance (GWT)

Given the mindmap is visible

When I click a node

Then the details panel shows that story

And outline selection is synchronized (same story highlighted)

---

## Level 1 — Root 4: AI-Powered Development

### Level 2 — 4200 AI Code Generation

#### Level 3 — US-0621 Enforce code-generation template

As a tech lead

I want code generation to follow the standard workflow template (checkout/rebase/analyze/implement/add gating tests/commit/push)

So that AI-generated changes are predictable and reviewable

Acceptance (GWT)

Given a code-generation task is executed

When the agent runs

Then the workflow follows the prescribed steps and produces a structured output

And gating tests are added/updated as part of the change when required by the story

### Level 2 — 4400 AI Analysis & Insights

#### Level 3 — US-0411 AI-based INVEST analysis (optional)

As a project owner

I want optional AI-assisted INVEST analysis controlled by configuration

So that teams can enable deeper guidance without making AI mandatory

Acceptance (GWT)

Given AI is enabled via environment configuration

When I request or trigger AI INVEST analysis

Then an analysis result is returned and associated to the story

And the result indicates it was AI-generated (source attribution)

---

## Level 1 — Root 5: GitHub Integration & Deployment

### Level 2 — 5100 Pull Request Management

#### Level 3 — US-0501 GitHub status endpoint

As a system operator

I want an endpoint to validate GitHub token presence and permissions

So that PR automation fails early with actionable diagnostics

Acceptance (GWT)

Given the system is configured (or misconfigured) with a GitHub token

When I call the GitHub status endpoint

Then the response clearly indicates valid/invalid and includes permission diagnostics

And the endpoint never returns or logs the token value

#### Level 3 — US-0511 Create PR from story

As a developer

I want to create a GitHub PR from a story from within AIPM

So that implementation work is traceable to the approved intent

Acceptance (GWT)

Given a story is Ready (or otherwise eligible)

When I request PR creation

Then AIPM creates a PR in the configured repo and stores PR metadata on the story

And the PR includes a specification artifact (e.g., TASK.md) derived from the story

#### Level 3 — US-0512 PR description from story fields

As a reviewer

I want PR title/body to include structured story intent and acceptance context

So that reviews are aligned to requirements rather than ad hoc code changes

Acceptance (GWT)

Given PR creation is triggered from a story

When the PR is created

Then the PR body contains the story’s As-a/I-want/So-that and key acceptance criteria references

And the formatting is consistent across PRs

#### Level 3 — US-0521 Merge PR from AIPM

As a maintainer

I want to request PR merge via AIPM (subject to checks/policy)

So that execution can be driven from a single system of record

Acceptance (GWT)

Given a PR exists and required checks are satisfied (per policy)

When I request merge from AIPM

Then AIPM attempts merge and updates PR status on the story

And failures return actionable messages (e.g., checks failing, conflicts)

### Level 2 — 5400 Development Environment

#### Level 3 — US-0001 Local dev boot

As a developer

I want to start AIPM locally with a single command and verify UI + API are reachable

So that development iteration is fast and reliable

Acceptance (GWT)

Given environment variables are set for tables and GitHub token (as needed)

When I start the service

Then the server starts on port 4000 (or next available) and serves UI + API successfully

And the health endpoint reports running

#### Level 3 — US-0002 Stage-aware configuration

As a DevOps engineer

I want STAGE=dev|prod to select environment-specific resources (tables, endpoints, deployment targets)

So that dev and prod are isolated and safe

Acceptance (GWT)

Given STAGE=dev

When the backend starts and handles requests

Then it reads/writes to dev resources (dev tables / dev endpoints)

And it never writes into prod resources unless explicitly configured

### Level 2 — 5500 Production Deployment

#### Level 3 — US-0711 “Test in Dev” deployment trigger

As a developer

I want to deploy a PR branch to the dev environment via a controlled workflow

So that changes are validated before merging to main

Acceptance (GWT)

Given a PR exists

When I trigger “Test in Dev”

Then CI deploys the PR branch to dev, runs validation, and records results

And AIPM/PR shows the deployment result

#### Level 3 — US-0721 Automatic production deployment on main

As a release manager

I want merges/pushes to main to run gating tests and deploy to production automatically

So that production remains current with controlled quality gates

Acceptance (GWT)

Given a change is merged into main

When the production pipeline runs

Then gating tests execute and production deploy is performed if gates pass

And production health verification is performed post-deploy

### Level 2 — 5600 CI/CD Pipeline

#### Level 3 — US-0731 Unified deploy-to-environment script

As a DevOps engineer

I want a unified deployment script (dev|prod) used consistently by CI and humans

So that deployment behavior is predictable and repeatable

Acceptance (GWT)

Given a target environment is specified

When the deploy script runs

Then it deploys frontend and backend to the correct targets for that stage

And it provides clear success/failure output and a verification step (health)

### Level 2 — 5610 GitHub Actions / Health & Readiness

#### Level 3 — US-0003 Health endpoint

As a system operator

I want a health endpoint that confirms service readiness

So that deployments and monitoring can verify correctness quickly

Acceptance (GWT)

Given the backend is running

When /health is called

Then it returns a success status and basic service info

And failures are clearly surfaced when dependencies are unavailable

### Level 2 — 5700 Documentation & Runbooks

#### Level 3 — US-1101 Keep the dev guide accurate

As a new contributor

I want documentation that accurately reflects setup, environment variables, local run, and test commands

So that onboarding is fast and consistent

Acceptance (GWT)

Given a clean environment and repository checkout

When I follow the documentation end-to-end

Then I can run the app locally and execute gating tests successfully

And any prerequisites are explicitly stated

#### Level 3 — US-1111 Emergency deploy and rollback runbook

As a system operator

I want an emergency runbook for deploy/rollback procedures

So that incidents can be mitigated quickly and safely

Acceptance (GWT)

Given a production incident requires rollback

When I follow the runbook steps

Then the system returns to a known-good version and passes health verification

And the procedure records what changed and how it was validated

---

## Level 1 — Root 6: Quality & Testing

### Level 2 — 6100 Acceptance Test Management

#### Level 3 — US-0201 Create acceptance test

As a QA/SDET

I want to create acceptance tests linked to a story using Given/When/Then steps

So that requirements are testable and support ATDD workflows

Acceptance (GWT)

Given a story exists

When I create an acceptance test with GWT steps and storyId

Then the acceptance test is persisted and retrievable by storyId

And the story details show linked tests

#### Level 3 — US-0202 Update acceptance test

As a QA/SDET

I want to edit acceptance test steps and metadata

So that tests stay aligned with evolving requirements

Acceptance (GWT)

Given an acceptance test exists

When I update the GWT steps

Then the updated content is persisted and returned

And updatedAt reflects the edit

#### Level 3 — US-0203 Delete acceptance test

As a QA/SDET

I want to delete acceptance tests linked to stories

So that obsolete tests do not confuse gating and traceability

Acceptance (GWT)

Given an acceptance test exists

When I delete it

Then it no longer appears in queries or story details

And story gating logic reflects the updated test set

### Level 2 — 6200 Gating Tests

#### Level 3 — US-0701 Run structured gating tests script

As a CI system

I want a standardized gating test runner with phased checks

So that releases are blocked on critical safety/quality conditions

Acceptance (GWT)

Given a commit or PR is being validated

When gating tests run

Then tests execute by phases and report pass/fail per phase

And critical failures block progression

### Level 2 — 6300 Done Criteria & Validation

#### Level 3 — US-0211 Done validation

As a project owner

I want rules that validate “Done” (e.g., required acceptance tests exist; optionally passing evidence is present)

So that “Done” is consistent and not subjective

Acceptance (GWT)

Given a story has zero acceptance tests (or fails required gating conditions)

When I attempt to set status to Done

Then the system blocks the transition or raises a warning per policy

And it clearly reports which rule(s) were not satisfied

---

## Critical (Not Implemented Yet)

These items are must-have stories for production readiness. They are not implemented yet and are prioritized for near-term delivery.

**CRIT-001 — Basic API authentication**

As a system owner

I want basic authentication on API routes (e.g., token or session-based)

So that only authorized clients can access and mutate data

Acceptance (GWT)

Given the API is running in a protected environment

When an unauthenticated request hits a protected endpoint

Then the request is rejected with a 401/403 response

And authenticated requests succeed per the access policy

**CRIT-002 — API rate limiting**

As a system operator

I want rate limiting on public-facing endpoints

So that abuse and accidental overload are prevented

Acceptance (GWT)

Given a client exceeds the configured request rate

When additional requests are sent within the limit window

Then the API responds with a rate-limit error and retry guidance

And normal requests resume after the window resets

**CRIT-003 — RTM virtualization for large datasets**

As a QA lead

I want RTM rows virtualized for large datasets

So that the UI stays responsive with hundreds or thousands of requirements

Acceptance (GWT)

Given 500+ requirements are loaded into RTM

When I scroll through the matrix

Then only visible rows are rendered and scrolling remains smooth

And no data is skipped or duplicated in the viewport

**CRIT-004 — Structured logging**

As a system operator

I want fully structured JSON logs for critical workflows (story CRUD, PR actions, deployments, AI calls)

So that troubleshooting and audit trails are consistent and machine-readable

Acceptance (GWT)

Given a request is handled by the backend

When it succeeds or fails

Then logs include a structured payload with action, status, timestamps, and correlation context

And logs exclude secrets or sensitive tokens

**CRIT-005 — Backup/restore validation**

As a system operator

I want automated validation that backups can be restored into a clean environment

So that recovery procedures are proven and reliable

Acceptance (GWT)

Given a backup export artifact exists

When I run the restore validation workflow

Then data is restored into a clean target and passes integrity checks

And the workflow reports success/failure with actionable diagnostics
