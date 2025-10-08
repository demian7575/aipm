# AI Project Manager Mindmap – Delivery Milestones

This roadmap documents how the project was implemented without third-party package
managers, using only the Node.js standard library.

## Phase 0 – Repository Skeleton ✅
* create `apps`, `packages`, `docs`, and automation directories
* document the high-level scope and offline constraints

## Phase 1 – Shared Domain Toolkit ✅
* author dependency-free schema guards for merge requests, user stories, and acceptance tests
* implement INVEST, ambiguity, and measurability validators plus roll-up helpers
* expose OpenAPI generation utilities and cover the logic with `node:test`

## Phase 2 – Backend Services ✅
* replace Fastify/Hono with a native `http` server exposing JSON endpoints
* implement in-memory repositories, depth/cycle guards, move/reorder APIs, and seed data
* serve static frontend assets, OpenAPI JSON, and provide reset/snapshot routes
* cover critical operations with backend `node:test` suites

## Phase 3 – Frontend Experience ✅
* build a vanilla JavaScript SPA (no bundler) for outline, mindmap, detail, and GitHub panels
* implement SVG radial layout, drag-to-reparent, keyboard navigation, and persistence
* wire forms directly to backend endpoints with optimistic refresh

## Phase 4 – Automation & Smoke Tests ✅
* add build scripts to copy backend/frontend assets into `dist/`
* provide Node-based E2E smoke exercising MR → Story → Test authoring and branch drift simulation
* configure npm scripts so CI can run tests, builds, and OpenAPI generation without external tooling

## Phase 5 – Documentation & Polish ✅
* update README and docs for the dependency-free architecture
* capture keyboard maps, API references, and branch protection guidance
* retain historical blocker notes for transparency

The repository now supports iterative enhancements while staying installable in offline
sandbox environments.
