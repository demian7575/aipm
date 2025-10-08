# AI Project Manager Mindmap

An interactive planning surface combining merge requests, user stories, and acceptance tests with INVEST validation, ambiguity detection, and synchronized outline/mindmap views.

## Getting Started
```bash
npm install
npm run dev
```
The development server exposes the JSON API and serves the static frontend at `http://localhost:4000`.

### Building and running the client only

```bash
npm run build            # copies SPA assets into dist/frontend
npm run preview          # serves the built assets from http://localhost:4000
```

The frontend is a static bundle located in `apps/frontend/public`. The build step copies those files into `dist/frontend`, and
`npm run preview` boots a lightweight HTTP server that serves them without starting the API.

## Scripts
- `npm run dev` – launch the backend API (serving the SPA assets)
- `npm run build` – copy backend/frontend assets into `dist/` and regenerate OpenAPI docs
- `npm run test` – execute shared validation tests and backend API tests
- `npm run e2e` – run a Node-based smoke scenario covering authoring flows
- `npm run generate:openapi` – rebuild `docs/openapi.json`

## Features
- **Outline Tree** with ARIA semantics, keyboard navigation, expand/collapse depth presets, and persistent state.
- **Radial Mindmap** rendered in SVG with a custom polar layout and drag-to-reparent interactions guarded by the backend.
- **Detail & GitHub Panels** exposing INVEST diagnostics, acceptance tests, drift status, and branch update simulation.
- **Validation Engine** shared between client and server for INVEST heuristics, ambiguity checks, measurability, and roll-up status computation.
- **In-memory Backend** implemented with native Node HTTP primitives enforcing depth/cycle guards and returning structured errors.

## Testing & CI
- Node's built-in test runner covers shared validation utilities and backend route handlers.
- A lightweight E2E script spins up the API and exercises create/update flows through HTTP requests.
- GitHub Actions workflow (`ci.yml`) runs tests, builds artifacts, and regenerates the OpenAPI document.

Refer to [docs/README.md](docs/README.md) for architecture diagrams, keyboard map, and API references.
