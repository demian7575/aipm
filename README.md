# AI Project Manager Mindmap – Phase 1

Phase 1 focuses exclusively on the shared validation utilities that define the domain
contracts for merge requests, user stories, and acceptance tests. The goal is to ship a
self-contained package that works in an offline-friendly environment, providing INVEST
validation, ambiguity detection, measurable `Then` checks, roll-up helpers, and a stable
OpenAPI snapshot for downstream services.

## What is included in Phase 1?

- Lightweight monorepo skeleton with a dedicated `@ai-pm/shared` workspace package.
- Runtime schema guards for Merge Requests, User Stories, and Acceptance Tests.
- Validation helpers covering INVEST checks, ambiguity detection, and measurable `Then` steps.
- Roll-up helpers that compute approval state for merge requests from story/test data.
- OpenAPI generator producing `docs/openapi.json` from the shared schema definitions.
- Node-based unit tests validating the behaviour of the shared utilities.

Later phases will introduce the backend API, frontend applications, visualization layers,
and CI pipeline as described in the implementation plan.

## Local development

The repository intentionally avoids external npm dependencies so that validation can run in
a restricted environment. Everything needed ships with the repo.

```bash
npm test                # runs shared validation tests via node:test
npm run generate:openapi # regenerates docs/openapi.json
```

Additional helper scripts (build/lint/dev) are placeholders that simply acknowledge the
current phase while returning a zero exit code. The validation helpers are published via the
package entry point at `packages/shared/src/index.js` for consumption by backend and frontend
workspaces in subsequent phases.
