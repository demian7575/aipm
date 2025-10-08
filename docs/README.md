# AI PM Mindmap

## Prerequisites
- Python 3.10+
- Node.js 18+

## Installation
```bash
# Install Python deps
pip install -r apps/backend/requirements.txt

# Install Node workspaces (verifies you are at the repo root before running npm install)
./scripts/bootstrap.sh
```

## Development
```bash
# Start backend and frontend together
npm run dev
```
Backend runs on <http://localhost:8000>, frontend on <http://localhost:5173> with API proxy.

## Tests
```bash
# Backend
pytest apps/backend

# Frontend unit tests
npm run test --workspace apps/frontend

# Playwright E2E
npm run test:e2e --workspace apps/frontend
```

## Build
```bash
# Backend OpenAPI artifact
npm run generate:openapi

# Frontend build
npm run build
```

## Seeding
The backend loads `apps/backend/app/data/seed.json` at startup. To reapply manually:
```bash
npm run seed
```

## OpenAPI Types
Generate shared TypeScript types from the running backend:
```bash
npm run generate:openapi && npx openapi-typescript http://localhost:8000/api/openapi.json -o packages/shared/types/index.d.ts
```
