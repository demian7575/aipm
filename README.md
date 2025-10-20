# AI Project Manager Mindmap

This repository contains a self-hosted mindmap and outline workspace for managing merge-request user stories, acceptance tests, and reference documentation. A Node.js backend exposes a SQLite-backed REST API and serves a vanilla JavaScript frontend that renders a right-expanding mindmap, outline tree, and detail panel with modal-driven editing flows.

## Requirements

- Node.js 18 or newer
  - Node 22+ unlocks the bundled `node:sqlite` driver.
  - On older runtimes, install the `sqlite3` CLI to retain full SQLite persistence.
  - If neither option is available, the server automatically falls back to a JSON-backed emulator so the app still runs (see
    [Data Storage](#data-storage)).
- Python 3.8+ with the standard `sqlite3` module (used to emit real SQLite snapshots when the JSON compatibility layer is
  active).
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

The workspace header exposes three panel toggles that persist in `localStorage`:

- **Outline** – Nested story outline with expand/collapse controls.
- **Mindmap** – Right-growing SVG mindmap that supports auto layout, manual drag positioning, and node expansion.
- **Details** – Story editor with INVEST validation feedback, reference document management, and acceptance test listings.

An **Employee Heat Map** button in the header opens a modal with an assignee drop-down. Select an individual (or all assignees) to view a percentage-based workload table arranged by activity rows and component columns. Percentages always total 100% per person and colour intensity reflects the relative share of effort by component.

Additional controls inside the panels include:

- **Auto Layout toggle** – Switch between deterministic radial layout and manual drag positioning (positions persist per story).
- **Expand All / Collapse All** – Adjust outline and mindmap expansion states together.
- **Create Acceptance Test / Create Child Story** – Launch modal forms that support warning overrides for INVEST and measurability policies.
- **Reference Document List** – Modal for adding, opening, and deleting linked documentation, including direct file uploads stored on the server.
- **Generate Document** – Header button that opens a panel for producing component-grouped Test or System Requirement documents across every user story. Requests use ChatGPT (when configured) to craft Markdown, automatically download the result, and fall back to the bundled formatter if AI access is unavailable.

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

### Why does GitHub only show “Create pull request”?

In this repository approvals are handled through pull requests. GitHub will only display the **Update branch** button when you
are viewing an open pull request whose head branch is behind the base. If you are working directly on a branch without an
existing PR (or the branch is already up to date), GitHub shows the **Create pull request** button instead. To merge your
changes you should open a PR from your working branch into `main`, request the required approvals, and then complete the merge.

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

Runtime data is stored in [`apps/backend/data/app.sqlite`](apps/backend/data/app.sqlite). A "Runtime Data" button in the application header links directly to `/api/runtime-data`, allowing you to download the current database snapshot at any time. Uploaded reference files are written to `apps/backend/uploads/` and served back at `/uploads/<file>`. When the runtime cannot access a native SQLite driver or CLI, a JSON-backed compatibility layer writes to `apps/backend/data/app.sqlite.json`, then invokes `python3`'s built-in `sqlite3` module to generate a genuine `.sqlite` file for downloads. Delete both files to reset the environment.

### Sample dataset

For load testing or demos, generate a SQLite database containing 50 hierarchical user stories (each with a draft acceptance test) by running:

```bash
npm run generate:sample-db -- docs/examples/app-50-stories.sqlite
```

The command writes a git-ignored file under `docs/examples/`. Copy the output to `apps/backend/data/app.sqlite` (and remove any accompanying `.json` shadow file) before starting the server to bootstrap the workspace with the larger tree. Pass `--help` to the script for CLI usage details or provide an alternate destination path.

The development server seeds:

- A root story with INVEST-compliant metadata and acceptance test.
- A child story to demonstrate hierarchy.
- A reference document entry.

The database file is recreated automatically if missing. Delete the SQLite (and `.json` when using the fallback) files to reset to seed data, or call `DELETE` endpoints to curate stories manually.

## Feature Highlights

- **Right-growing mindmap** with rectangular user story nodes, red-highlighted titles, and ancestor expansion synced to the outline.
- **Outline tree** with keyboard-accessible expand/collapse controls and selection synchronization.
- **Details panel** showing INVEST warnings, story point editing with non-negative integer validation, assignee email launch, acceptance test tables, child story lists, and a dedicated **Components** field backed by a curated catalog (`WorkModel`, `Document_Intelligence`, `Review_Governance`, `Orchestration_Engagement`, `Run_Verify`, `Traceabilty_Insight`).
- **Employee Heat Map modal** with an assignee selector that visualises workload as per-assignee percentages (summing to 100%) so project managers can balance component focus, identify skill clusters, and spot gaps at a glance.
- **Modal workflows** for creating child stories, acceptance tests (with measurability hints), and reference documents.
- **Warning overrides** that allow saving despite INVEST or measurability warnings after user confirmation.
- **Persistent layout state** including panel visibility, expanded nodes, manual mindmap coordinates, and the last selected story.
- **ChatGPT-assisted INVEST analysis** with inline summaries and issue annotations whenever an OpenAI API key is provided.

### User Story Status Reference

| Status    | Description                                                                 |
| --------- | --------------------------------------------------------------------------- |
| Draft     | Story is being authored or refined; requirements may still change.         |
| Ready     | Story satisfies INVEST checks with measurable tests and is planning-ready. |
| Approved  | Story has been reviewed and accepted for execution.                        |

### ChatGPT Configuration

User story INVEST checks call ChatGPT when the backend is launched with an OpenAI API key. Configure the integration with the
following environment variables (set them before running `npm run dev` or `npm run start`):

| Variable | Description |
| --- | --- |
| `AI_PM_OPENAI_API_KEY` | API key used to authenticate with ChatGPT (falls back to `OPENAI_API_KEY` if unset). |
| `AI_PM_OPENAI_API_URL` | Optional override for the Chat Completions endpoint (defaults to `https://api.openai.com/v1/chat/completions`). |
| `AI_PM_OPENAI_MODEL` | ChatGPT model name to request (default `gpt-4o-mini`). |
| `AI_PM_DISABLE_OPENAI` | Set to `1` or `true` to bypass ChatGPT even when an API key is available. |

If the API key is omitted or the OpenAI request fails, the backend automatically falls back to the built-in heuristic policy.
When ChatGPT is active, heuristics are still evaluated but presented only as optional suggestions while the AI verdict determines INVEST pass/fail.
The frontend surfaces whether the feedback came from ChatGPT or the local rule engine so product managers always know which signals informed the INVEST health check.

## Scripts

| Command            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Start the API + frontend server (auto port fallback)       |
| `npm run build`    | Copy backend/frontend assets into `dist/`                  |
| `npm test`         | Execute the Node-based HTTP/API test suite                 |
| `npm run start`    | Alias for launching the production server (`server.js`)    |

## Support

If the SQLite driver emits an experimental warning, ensure you are running Node 22+. When running on the JSON fallback, remove both `apps/backend/data/app.sqlite` and `apps/backend/data/app.sqlite.json` before restarting the server to trigger a clean seed.
