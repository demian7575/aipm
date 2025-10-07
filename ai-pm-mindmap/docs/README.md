# AI PM Mindmap

## Prerequisites
- Node.js 18+
- npm 9+

## Installation
```bash
npm install
```

## Development
```bash
npm run dev
```
This command runs the backend on port 4000 and the frontend on port 5173.

## Building
```bash
npm run build
```

## Testing
```bash
npm run test
npm run e2e
```

## Linting
```bash
npm run lint
```

## OpenAPI
```bash
npm run generate:openapi
```
The generated specification is saved to `docs/openapi.json` and served from `/api/openapi.json`.

## Seeding
```bash
npm run seed
```
Resets the in-memory store to the sample dataset.

## Documentation
- Product requirements: [`docs/requirements/PRD.md`](requirements/PRD.md)
- GWT acceptance criteria: [`docs/requirements/GWT.md`](requirements/GWT.md)
