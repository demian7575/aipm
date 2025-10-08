# AI Project Manager Mindmap – Developer Guide

## Prerequisites
- Node.js 20+
- npm 10+
- Modern browser for running the frontend

## Workspace Commands
```bash
npm install
npm run dev         # serves API + SPA from http://localhost:4000
npm run build       # copies backend/frontend assets into dist/ and regenerates OpenAPI
npm run test        # shared + backend test suites
npm run e2e         # Node-based smoke against local API
npm run generate:openapi
npm run seed        # reseed SQLite-backed data store
```

### Persistence notes
- The backend automatically seeds the database only when it detects an empty store.
- Existing records remain intact across restarts; run `npm run seed` or `POST /api/reset` when you need a clean slate.

## Client build & preview
```bash
npm run build       # copies SPA into dist/frontend alongside backend bundle
npm run preview     # serves dist/frontend on http://localhost:4000 without API
```
The frontend lives in `apps/frontend/public`. The build script mirrors those assets to `dist/frontend`, and the preview command
spins up a static file server so you can inspect the client bundle in isolation.

## Architecture Overview
- **packages/shared** – Dependency-free schema guards, INVEST/ambiguity/measurability validators, and OpenAPI builder utilities.
- **apps/backend** – Native Node HTTP server exposing REST endpoints, SQLite persistence, depth/cycle guards, roll-up helpers, and static asset hosting.
- **apps/frontend** – Vanilla JavaScript single-page app (SVG mindmap + outline tree) served from `apps/frontend/public`.
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
- `Shift + Click`: Recursively toggle descendants

## URL Parameters
- `?expand=all` – expand entire tree on load
- `?expand=none` – collapse tree on load
- `?expand=depth:N` – expand to a given depth (root = 1)

## API Reference
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

## Branch Protection Guidance
The CI workflow (`.github/workflows/ci.yml`) runs tests, builds, and OpenAPI generation. Protect `main` with mandatory status checks on the `ci` workflow.
