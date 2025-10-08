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
# (runs npm install from the repository root and fails fast if you are in the wrong folder)
./scripts/bootstrap.sh
```

> **Tip:** If you prefer to run `npm install` manually, make sure your current directory contains `package.json`.
> A common `ENOENT: no such file or directory, open '.../package.json'` error means you are not at the repo root.

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
