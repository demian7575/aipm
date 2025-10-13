# AI Project Manager Mindmap

This repository contains a self-hosted mindmap and outline workspace for managing merge-request user stories, acceptance tests, and reference documentation. A Node.js backend exposes a SQLite-backed REST API and serves a vanilla JavaScript frontend that renders a right-expanding mindmap, outline tree, and detail panel with modal-driven editing flows.

## Requirements

- Node.js 18 or newer
  - Node 22+ unlocks the bundled `node:sqlite` driver.
  - On older runtimes, install the `sqlite3` CLI to retain full SQLite persistence.
  - If neither option is available, the server automatically falls back to a JSON-backed emulator so the app still runs (see
    [Data Storage](#data-storage)).
- macOS, Linux, or WSL shell with Bash-compatible tooling

> No third-party npm dependencies are required; the project relies entirely on Node.js built-ins.

## Installation

Running `npm install` creates a lockfile for reproducibility. No packages are downloaded, so the command succeeds even in offline environments.

```bash
npm install
```

## Development

Launch the API server and static frontend with:

```bash
npm run dev
```

- The service binds to port `4000` by default and automatically retries on the next available port if the address is in use.
- Static assets live under `apps/frontend/public/` and are served by the backend.

### Available Panels & Controls

The workspace header exposes three toggles that persist in `localStorage`:

- **Outline** – Nested story outline with expand/collapse controls.
- **Mindmap** – Right-growing SVG mindmap that supports auto layout, manual drag positioning, and node expansion.
- **Details** – Story editor with INVEST validation feedback, reference document management, and acceptance test listings.

Additional controls inside the panels include:

- **Auto Layout toggle** – Switch between deterministic radial layout and manual drag positioning (positions persist per story).
- **Expand All / Collapse All** – Adjust outline and mindmap expansion states together.
- **Create Acceptance Test / Create Child Story** – Launch modal forms that support warning overrides for INVEST and measurability policies.
- **Reference Document List** – Modal for adding, opening, and deleting linked documentation, including direct file uploads stored on the server.

## Building

Produce a distributable copy of the backend and frontend assets in `dist/`:

```bash
npm run build
```

The build script copies `apps/backend` and `apps/frontend/public` into `dist/` for deployment.

## Testing

Run the Node.js test suite (using the built-in `node:test` harness) to exercise the REST API and SQLite persistence:

```bash
npm test
```

## Branching

All active development has been merged into the `main` branch; check out `main` to run the workspace locally or to build new
features on top of the latest codebase.

## Project Structure

```
apps/
  backend/
    app.js        # HTTP server + SQLite data layer
    server.js     # CLI entry point for `npm run dev`
  frontend/
    public/
      index.html
      styles.css
      app.js      # Outline + mindmap + detail panel logic
scripts/
  build.js        # Copies backend/frontend into dist/
tests/
  backend.test.js # API regression coverage
```

## Data Storage

Runtime data is stored in `apps/backend/data/app.sqlite`. Uploaded reference files are written to `apps/backend/uploads/` and served back at `/uploads/<file>`. When the runtime cannot access a native SQLite driver or CLI, a JSON-backed compatibility layer writes to `apps/backend/data/app.sqlite.json` while keeping the REST API contract intact. Delete both files to reset the environment.

The development server seeds:

- A root story with INVEST-compliant metadata and acceptance test.
- A child story to demonstrate hierarchy.
- A reference document entry.

The database file is recreated automatically if missing. Delete the SQLite (and `.json` when using the fallback) files to reset to seed data, or call `DELETE` endpoints to curate stories manually.

## Feature Highlights

- **Right-growing mindmap** with rectangular user story nodes, red-highlighted titles, and ancestor expansion synced to the outline.
- **Outline tree** with keyboard-accessible expand/collapse controls and selection synchronization.
- **Details panel** showing INVEST warnings, story point editing with non-negative integer validation, assignee email launch, acceptance test tables, and child story lists.
- **Modal workflows** for creating child stories, acceptance tests (with measurability hints), and reference documents.
- **Warning overrides** that allow saving despite INVEST or measurability warnings after user confirmation.
- **Persistent layout state** including panel visibility, expanded nodes, manual mindmap coordinates, and the last selected story.

## Scripts

| Command            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Start the API + frontend server (auto port fallback)       |
| `npm run build`    | Copy backend/frontend assets into `dist/`                  |
| `npm test`         | Execute the Node-based HTTP/API test suite                 |
| `npm run start`    | Alias for launching the production server (`server.js`)    |

## Support

If the SQLite driver emits an experimental warning, ensure you are running Node 22+. When running on the JSON fallback, remove both `apps/backend/data/app.sqlite` and `apps/backend/data/app.sqlite.json` before restarting the server to trigger a clean seed.
