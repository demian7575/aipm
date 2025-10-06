# AI PM Mindmap Monorepo

This repository hosts the full-stack AI PM Mindmap workspace with a Vite + React frontend, an Express backend, and shared TypeScript packages for schemas, validation, and OpenAPI generation.

## Workspaces

- `apps/frontend` – Outline + mindmap UI with React Query, accessibility-first tree interactions, and Playwright smoke tests.
- `apps/backend` – Express API exposing merge request, story, and acceptance test operations with in-memory persistence and OpenAPI docs.
- `packages/shared` – Zod schemas, INVEST scoring, ambiguity detection utilities, and OpenAPI builder helpers.

## Quick Start

```bash
pnpm install
pnpm dev
```

The command starts both backend (`3333`) and frontend (`5173`) servers concurrently.

## Testing & Quality

```bash
pnpm lint
pnpm test
pnpm --filter @ai-pm-mindmap/backend test:integration
pnpm e2e
```

See [`docs/README.md`](docs/README.md) for detailed setup, testing, and OpenAPI generation steps.
