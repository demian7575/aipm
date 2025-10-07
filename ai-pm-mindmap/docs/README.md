# AI PM Mindmap

## Getting Started

```bash
npm install
npm run dev
```

This launches the backend on http://localhost:4000 and the frontend on http://localhost:5173.

## Available Commands

- `npm run build` – build shared package, backend, and frontend bundles.
- `npm run dev` – start backend and frontend in watch mode.
- `npm run lint` – run ESLint across workspaces.
- `npm run test` – execute unit and integration test suites.
- `npm run e2e` – run Playwright smoke tests.
- `npm run generate:openapi` – regenerate OpenAPI specification from schemas.
- `npm run seed` – reseed the in-memory backend store.
- `npm run bundle:check` – enforce bundle size guard for the frontend build.

## Project Structure

```
ai-pm-mindmap/
  apps/
    backend/
    frontend/
  packages/
    shared/
  docs/
  scripts/
  .github/workflows/
```

## Environment Variables

- `MAX_STORY_DEPTH` – optional override for the story tree depth limit (default `4`).
- `INVEST_MAX_DAYS` – override the INVEST "Small" threshold in dev-days (default `2`).
- `INVEST_MAX_CHILDREN` – override the INVEST child limit (default `5`).

## Docs

- Product requirements: [`docs/requirements/PRD.md`](requirements/PRD.md)
- Gherkin acceptance criteria: [`docs/requirements/GWT.md`](requirements/GWT.md)
- Generated OpenAPI spec: [`docs/openapi.json`](openapi.json)

## Accessibility & UX

- Outline tree view exposes ARIA `role="tree"` metadata.
- Keyboard shortcuts: arrow keys for navigation, Enter to edit, A/S/T to add, Delete to remove.
- Mindmap view mirrors the selected merge request and stories with a radial layout.
- Detail panel surfaces INVEST, ambiguity, and measurement validation hints.

## CI

GitHub Actions pipeline runs lint, unit/integration tests, build, bundle guard, OpenAPI generation, and Playwright smoke tests.
