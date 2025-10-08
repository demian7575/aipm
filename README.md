# AI Project Manager Mindmap

An interactive planning surface combining merge requests, user stories, and acceptance tests with INVEST validation, ambiguity detection, and synchronized outline/mindmap views.

## Getting Started
```bash
pnpm install
pnpm dev
```
The command launches the backend on port 4000 and the Vite frontend on port 5173.

## Scripts
- `pnpm dev` – run backend and frontend in parallel
- `pnpm build` – build all packages and apps
- `pnpm test` – run shared, backend, and frontend unit tests
- `pnpm e2e` – execute Playwright smoke scenarios
- `pnpm generate:openapi` – regenerate `docs/openapi.json`

## Features
- **Outline Tree** with ARIA semantics, keyboard shortcuts, virtual scrolling, and URL-driven expansion presets.
- **Radial Mindmap** powered by React Flow and a d3-cluster worker for performant layouts.
- **Detail & GitHub Panels** exposing INVEST diagnostics, acceptance tests, drift state, and branch update simulation.
- **Validation Engine** shared between client and server for INVEST heuristics, ambiguity checks, and roll-up status computation.
- **In-memory Backend** with Fastify, OpenAPI docs, and rich tree operations (move, reorder, path lookup).

## Testing & CI
- Vitest covers shared validations, backend guards, and frontend render behaviors.
- Playwright smoke suite validates end-to-end authoring flows.
- GitHub Actions workflow (`ci.yml`) runs linting, testing, builds, OpenAPI generation, Playwright, and size guard.

Refer to [docs/README.md](docs/README.md) for architecture diagrams, keyboard map, and API references.
