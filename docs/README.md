# AI Project Manager Mindmap – Developer Guide

## Prerequisites
- Node.js 20+
- pnpm 8+
- Modern browser for running the frontend

## Workspace Commands
```bash
pnpm install
pnpm dev            # runs backend (port 4000) and frontend (port 5173)
pnpm build          # builds all packages and apps
pnpm test           # runs unit and integration tests
pnpm e2e            # executes Playwright smoke tests
pnpm generate:openapi
pnpm seed           # reseed backend in-memory data
```

## Architecture Overview
- **packages/shared** – Zod schemas, validation utilities (INVEST, ambiguity detection, measurability), and OpenAPI builder.
- **apps/backend** – Fastify-based API with in-memory repositories, validation enforcement, Swagger UI, and seed data.
- **apps/frontend** – Vite + React application featuring outline tree, radial mindmap (React Flow + d3 cluster), detail and GitHub panels, and Zustand-powered workspace state.
- **docs** – OpenAPI specification and implementation roadmap.

```
ai-pm-mindmap/
  apps/
    backend/
    frontend/
  packages/
    shared/
  docs/
```

## Keyboard Map (Outline Tree)
- `↑ / ↓`: Move focus between visible stories
- `→`: Expand current story
- `←`: Collapse current story
- `Enter`: Focus detail panel
- `A`: Add child story
- `S`: Add root-level sibling story
- `T`: Add acceptance test for selected story
- `Shift + Click`: Recursively toggle descendants

## URL Parameters
- `?expand=all` – expand entire tree on load
- `?expand=none` – collapse tree on load
- `?expand=depth:N` – expand to a given depth (root = 1)

## API Reference
- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

## Branch Protection Guidance
The CI workflow (`.github/workflows/ci.yml`) runs lint, tests, builds, Playwright smoke, size guard, and OpenAPI generation. Protect `main` with mandatory status checks on the `ci` workflow.
