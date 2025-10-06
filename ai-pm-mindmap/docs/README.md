# AI PM Mindmap

This monorepo contains a lightweight backend API, a React Vite frontend, and shared validation utilities for building mindmap-oriented product requirement workflows.

## Prerequisites

* Node.js 18+
* pnpm 8+

## Setup

Ensure you are at the monorepo root (the folder containing `package.json`) before installing dependencies. If you cloned into a
parent workspace, `cd ai-pm-mindmap` first.

```bash
pnpm install
```

## Development

Start the backend and frontend together:

```bash
pnpm dev
```

Backend will run on `http://localhost:3333` and frontend on `http://localhost:5173`.

### Backend-only workflows

Need only the API while testing or integrating another client? From the repo root you can:

- **Development:** `pnpm --filter backend dev` – runs the Express server with hot reload on port `3333`.
- **Production:** `pnpm --filter backend start` – executes the compiled server from `apps/backend/dist` on port `3333` (run `pnpm build` first).

## Build & Run Sequence

Follow these commands in order when you need a production build and locally hosted preview:

1. Install dependencies (only required once or after dependency updates):

   ```bash
   pnpm install
   ```

2. Build all workspaces (shared, backend, frontend):

   ```bash
   pnpm build
   ```

3. Start the compiled backend API (terminal #1):

   ```bash
   pnpm --filter backend start
   ```

4. Serve the compiled frontend assets in another terminal:

   ```bash
   pnpm preview
   ```

## Testing & Quality

```bash
pnpm lint      # ESLint across the workspace
pnpm test      # Unit tests (Vitest)
pnpm e2e       # Playwright smoke suite (requires web servers)
```

## Build & Preview

```bash
pnpm build
pnpm preview
```

## API Documentation

Generate the OpenAPI specification and serve docs:

```bash
pnpm generate:openapi
```

Open `http://localhost:3333/api/docs` for Swagger UI. A static JSON copy lives in `docs/openapi.json`.

## Seed & Reset

```bash
pnpm seed
```

The command resets the in-memory data set with sample merge requests, stories, and acceptance tests.

## Publishing Changes to GitHub

1. Review local changes and staged files:

   ```bash
   git status
   ```

2. Stage the updates you want to publish:

   ```bash
   git add <file>            # stage specific files
   git add .                 # or stage everything
   ```

3. Record the change with a descriptive message:

   ```bash
   git commit -m "feat: describe the change"
   ```

4. Link the repository to GitHub (first-time only):

   ```bash
   git remote add origin https://github.com/<org>/<repo>.git
   ```

5. Pull the latest commits from GitHub before pushing (avoids conflicts):

   ```bash
   git pull --rebase origin <branch-name>
   ```

   For example, if you are working on `main`, run `git pull --rebase origin main`.

6. Push your branch to GitHub:

   ```bash
   git push -u origin <branch-name>
   ```

If the branch already exists remotely, you can simply run `git push`. When collaborating, pulling with `--rebase` keeps your history linear while incorporating remote updates.
