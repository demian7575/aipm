# AI PM Mindmap Monorepo

This repository hosts the full-stack AI PM Mindmap workspace with a Vite + React frontend, an Express backend, and shared TypeScript packages for schemas, validation, and OpenAPI generation.

## Workspaces

- `apps/frontend` – Outline + mindmap UI with React Query, accessibility-first tree interactions, and Playwright smoke tests.
- `apps/backend` – Express API exposing merge request, story, and acceptance test operations with in-memory persistence and OpenAPI docs.
- `packages/shared` – Zod schemas, INVEST scoring, ambiguity detection utilities, and OpenAPI builder helpers.

## Quick Start

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. For live development, run the combined dev server (starts backend on `3333` and frontend on `5173`):

   ```bash
   pnpm dev
   ```

3. To build production bundles and run them locally, execute:

   ```bash
   pnpm build
   pnpm preview
   ```

   `pnpm build` compiles the shared package followed by backend and frontend apps. `pnpm preview` serves the built frontend while the backend can be started with `pnpm --filter backend start` if you need the API separately.

## Build & Run Cheat Sheet

When you specifically need the build + run sequence, follow these commands in order:

| Step | Command | Purpose |
| --- | --- | --- |
| 1 | `pnpm install` | Resolve and link workspace dependencies. |
| 2 | `pnpm build` | Produce production bundles for shared, backend, and frontend packages. |
| 3 | `pnpm --filter backend start` | Launch the compiled backend API on port `3333`. |
| 4 | `pnpm preview` | Serve the built frontend (proxying API calls to `3333`). |

Run steps 3 and 4 in separate terminals so the API and preview server stay active simultaneously.

### Running only the backend API

Need just the backend? Use one of the following commands from the repository root:

- **Development (hot reload):** `pnpm --filter backend dev` – runs the Express API with `ts-node-dev`, providing fast TypeScript reloads on port `3333`.
- **Production (after build):** `pnpm --filter backend start` – runs the compiled output from `apps/backend/dist` on port `3333`.

If this is your first time running the backend in isolation, ensure the shared package has been built with `pnpm --filter shared build` or run the full `pnpm build` first.

## Testing & Quality

```bash
pnpm lint
pnpm test
pnpm --filter @ai-pm-mindmap/backend test:integration
pnpm e2e
```

See [`docs/README.md`](docs/README.md) for detailed setup, testing, and OpenAPI generation steps.
