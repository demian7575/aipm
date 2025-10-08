# AI Project Manager Mindmap – Incremental Delivery Plan

This document breaks the comprehensive specification into manageable phases. Each phase
concludes with a functional milestone that can be reviewed and iterated upon before
advancing.

## Phase 0 – Project Skeleton & Tooling
- Initialize the monorepo with `apps/frontend`, `apps/backend`, `packages/shared`, `docs`, and `.github/workflows` directories.
- Provide placeholder README explaining the roadmap and development conventions.
- Deliverable: Repository structure checked in with documentation only.

## Phase 1 – Shared Package Foundations
- Implement runtime schema guards for MergeRequest, UserStory, and AcceptanceTest with validation rules (lengths, enums, timestamps).
- Add validation helpers: INVEST evaluation, ambiguity detection (ko/en), measurable `Then` checks, and policy configuration.
- Export utilities for frontend/backend consumption and generate initial OpenAPI definitions without relying on external packages.
- Deliverable: `npm test` validates helpers with unit tests; OpenAPI generator outputs baseline spec to `docs/openapi.json`.

## Phase 2 – Backend MVP
- Build Hono/Fastify-compatible server (or equivalent minimal HTTP layer) with in-memory repositories and REST endpoints for CRUD on merge requests, stories, and acceptance tests.
- Enforce validation on create/update, including depth checks and INVEST policies.
- Seed data with example MR (`MR:XXXX`), nested stories, and tests illustrating failing INVEST and ambiguity cases.
- Expose Swagger UI and OpenAPI JSON; implement reset/snapshot endpoints.
- Deliverable: Backend responds to core CRUD operations with validation errors handled; automated tests cover move/reorder guards and roll-up logic.

## Phase 3 – Frontend Shell & State Management
- Scaffold Vite + React app with routing and layout (Outline tree pane, Mindmap pane, detail panels, GitHub status panel placeholder).
- Configure Zustand stores for MR/stories/tests, API clients using shared OpenAPI types, and React Query or manual fetch helpers.
- Integrate React Hook Form (or equivalent) for story/test forms with validation feedback.
- Deliverable: Users can load seed MR, display outline list, edit basic story/test fields with validation feedback.

## Phase 4 – Outline Tree Enhancements
- Implement ARIA-compliant tree with virtual scrolling, keyboard shortcuts, expand/collapse persistence, and depth expansion actions.
- Support add child/sibling/test shortcuts, deletion, and numbering display (`US1`, `AT1-A`, etc.).
- Synchronize tree changes with backend move/reorder endpoints; handle optimistic updates and error rollback.
- Deliverable: Outline view fully interactive with keyboard/mouse parity, passing accessibility lint checks and frontend unit tests.
- _Status_: Blocked until Phases 2 and 3 provide the backend endpoints and frontend shell. See `docs/status/phase4-blockers.md` for details.

## Phase 5 – Mindmap Visualization
- Integrate React Flow with radial layout computed via `d3-hierarchy` cluster; map API data to nodes/edges.
- Offload layout computation to Web Worker for larger datasets; ensure smooth pan/zoom and selection sync with outline.
- Implement drag-to-reparent with backend move guard handling and depth/cycle validation feedback.
- Deliverable: Mindmap mirrors outline state, re-renders on mutations, and drag interactions respect constraints.

## Phase 6 – Detail & GitHub Panels
- Build detail panel showing INVEST breakdown, ambiguity warnings, and quick-fix suggestions.
- Implement acceptance test list editing with Given/When/Then enforcement and ambiguity/measurable helper prompts.
- Add GitHub metadata panel reflecting branch, drift status, last sync, and trigger for branch update simulation.
- Deliverable: Side panels provide actionable validation insights; branch simulation toggles drift in backend and refreshes UI.

## Phase 7 – Comprehensive Testing & CI
- Expand test coverage for backend and frontend layers, including MSW-based integration tests and Playwright smoke flows.
- Configure GitHub Actions workflow executing lint, unit/integration tests, builds, Playwright E2E, size-limit, and OpenAPI generation.
- Deliverable: CI pipeline passes on clean repository; README documents branch protection expectations and developer workflows.

## Phase 8 – Documentation & Polish
- Complete docs: `/docs/README.md`, requirements summaries, keyboard maps, API references, environment setup instructions.
- Provide localized copy for ko/en via `react-i18next`, including ambiguity messages.
- Review accessibility (focus states, ARIA roles) and performance (virtualized lists, memoization).
- Deliverable: Repository ready for stakeholder review with comprehensive documentation and internationalization support.

---

By iterating through these phases, the team can produce reviewable increments, validate complex
behavior early, and reduce risk associated with the full specification.
