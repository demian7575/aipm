# ai-pm-mindmap

Monorepo containing a FastAPI backend and React + TypeScript frontend to manage merge requests, stories, and acceptance tests with mindmap visualisation.

## Prerequisites

- Python 3.10+
- Node.js 18+

## Install Dependencies

```bash
# Backend dependencies
pip install -r apps/backend/requirements.txt

# JavaScript workspaces (frontend + shared)
npm install
```

## Run in Development

```bash
# Start FastAPI (port 8000) and Vite dev server (port 5173) together
npm run dev
```

## Test, Build, and Utilities

```bash
# Backend + frontend unit tests
npm run test

# Playwright end-to-end tests
npm run e2e

# Production frontend build
npm run build

# Regenerate backend OpenAPI schema artifact
npm run generate:openapi

# Reseed in-memory backend data
npm run seed
```

## Further Documentation

Detailed architecture notes, CI information, and flow walkthroughs live in [docs/README.md](docs/README.md).
