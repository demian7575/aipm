# AI Project Manager Mindmap

An interactive planning surface combining merge requests, user stories, and acceptance tests with INVEST validation, ambiguity detection, and synchronized outline/mindmap views.

## Getting Started
> **Runtime requirement:** The backend relies on Node.js 22+ for the built-in `node:sqlite` module. Earlier runtimes will fail to
> load the database driver.
```bash
npm install
npm run dev
```
The development server exposes the JSON API and serves the static frontend at `http://localhost:4000`.
If that port is occupied the backend automatically advances to the next open port and logs the chosen address.

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
- **Right-expanding Mindmap** rendered in SVG with fixed-width rectangular nodes, red story titles, click-to-edit selection, and draggable positioning. Hold `Alt` (or `Ctrl/Cmd`) while dragging to reparent under a new parent story.
- **Detail & GitHub Panels** exposing INVEST diagnostics, acceptance tests, drift status, branch update simulation, and hierarchical add/remove forms.
- **Validation Engine** shared between client and server for INVEST heuristics, ambiguity checks, measurability, and roll-up status computation.
- **SQLite-backed Backend** implemented with native Node HTTP primitives enforcing depth/cycle guards, persisting data across restarts, and returning structured errors. The store only reseeds when empty; use the Reset button or `npm run seed` to restore the baseline dataset.

## Testing & CI
- Node's built-in test runner covers shared validation utilities and backend route handlers.
- A lightweight E2E script spins up the API and exercises create/update flows through HTTP requests.
- GitHub Actions workflow (`ci.yml`) runs tests, builds artifacts, and regenerates the OpenAPI document.

Refer to [docs/README.md](docs/README.md) for architecture diagrams, keyboard map, and API references.
