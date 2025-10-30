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

An **Employee Heat Map** button in the header opens a modal with an assignee drop-down. Select an individual (or all assignees) to view a percentage-based workload table that mirrors the shared template. The first column reads **Activity -> Area >** and the remaining columns cover **System (S/S)**, **WorkModel (WM)**, **DocumentIntelligence (DI)**, **Review & Governance (RG)**, **Orchestration & Engagement (OE)**, **Run & Verify (RV)**, and **Traceability & Insight (TI)**. Activity rows include Design, Documentation, Implementation, Operations & Visualization, Resource Management, Test Automation, and Verification. Percentages always total 100% per person and colour intensity reflects the relative share of effort by component.

Additional controls inside the panels include:

- **Auto Layout toggle** – Switch between deterministic radial layout and manual drag positioning (positions persist per story).
- **Expand All / Collapse All** – Adjust outline and mindmap expansion states together.
- **Create Acceptance Test / Create Child Story** – Launch modal forms that support warning overrides for INVEST and verifiability policies.
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
- **Details panel** showing INVEST warnings, story point editing with non-negative integer validation, assignee email launch, acceptance test tables, child story lists, curated **Components** selection, and a task manager that requires each task to include an explicit assignee before it can be saved.
- **Employee Heat Map modal** with an assignee selector that visualises workload as per-assignee percentages (summing to 100%) so project managers can balance component focus, identify skill clusters, and spot gaps at a glance.
- **Modal workflows** for creating child stories, acceptance tests (with verifiability hints), and reference documents, with a quick-access header button for the reference library.
- **Warning overrides** that allow saving despite INVEST or verifiability warnings after user confirmation.
- **Persistent layout state** including panel visibility, expanded nodes, manual mindmap coordinates, and the last selected story.
- **ChatGPT-assisted INVEST analysis** with inline summaries and issue annotations whenever an OpenAI API key is provided.

### User Story Status Reference

| Status       | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| Draft        | Story is being authored or refined; requirements may still change.         |
| Ready        | Story satisfies INVEST checks with verifiable acceptance tests and is planning-ready. |
| In Progress  | Story is actively being implemented and validated by the delivery team.    |
| Blocked      | Story progress is impeded by external dependencies or unresolved issues.   |
| Approved     | Story has been reviewed and accepted for execution.                        |
| Done         | Story delivered; all descendant stories are Done and every acceptance test has status Pass. |

> **Note:** The workspace enforces the Done status guard automatically—if a story has children that are not Done or any acceptance test that is not Pass, the API rejects the transition with actionable feedback.

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

### Codex Delegation Configuration

The **Develop with Codex** workflow now ships with an embedded delegation service that listens on `http://127.0.0.1:5005/delegate` by default. The embedded service accepts requests from the backend immediately after startup so you can test the flow without wiring an external Codex instance. Deployments that already have a delegation API can still point the integration elsewhere via environment variables:

| Variable | Description |
| --- | --- |
| `AI_PM_CODEX_DELEGATION_URL` | Optional override for the delegation endpoint. Defaults to the embedded server URL. |
| `AI_PM_CODEX_DELEGATION_TOKEN` | Optional bearer token forwarded to the delegation service for authentication (also enterable per request in the modal). |
| `AI_PM_CODEX_PROJECT_URL` | Optional Codex project identifier forwarded with each request. |
| `AI_PM_DISABLE_EMBEDDED_CODEX` | Set to `1`/`true` to skip starting the embedded delegation server. |
| `AI_PM_CODEX_EMBEDDED_HOST` | Hostname/interface for the embedded server (default `127.0.0.1`). |
| `AI_PM_CODEX_EMBEDDED_PORT` | Listening port for the embedded server (default `5005`). |
| `AI_PM_CODEX_EMBEDDED_PATH` | Request path for the embedded `/delegate` endpoint (default `/delegate`). |
| `AI_PM_CODEX_EMBEDDED_PROTOCOL` | Protocol used when advertising the embedded endpoint (default `http`). |
> **Delegation output:** The embedded server now generates Codex task metadata (ID, URL, status) rather than creating GitHub pull requests. Use the returned task details to track progress or surface follow-up actions inside AIPM.

#### Codex token configuration

Most authentication issues stem from a missing token when your delegation service requires one. Follow these steps before launching the backend whenever credentials are needed:

1. Obtain a bearer token from your Codex delegation service (if authentication is required).
2. Export the token in the same terminal session that will run `npm run dev` or `npm run start`:

   ```bash
   export AI_PM_CODEX_DELEGATION_TOKEN="codex_token_example123"
   ```

   Tokens entered in the modal take precedence over the environment variable for a single request.

3. Start the backend (`npm run dev`). The embedded delegation server reads the variable during startup.
4. Trigger the **Develop with Codex** flow from the UI or repeat your `curl` call. Successful responses include a `taskUrl`, confirming the request was accepted.

The embedded server reports which token source (modal input, Authorization header, or environment variable) was used so you can quickly verify the credential that needs updating.

When the backend cannot reach the configured endpoint it returns a clear `Unable to reach Codex delegation server …` error describing the URL that was attempted. Update the URL or disable the embedded service if you plan to run an external delegation server on a different host/port.

## Scripts

| Command            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Start the API + frontend server (auto port fallback)       |
| `npm run build`    | Copy backend/frontend assets into `dist/`                  |
| `npm test`         | Execute the Node-based HTTP/API test suite                 |
| `npm run start`    | Alias for launching the production server (`server.js`)    |

## Support

If the SQLite driver emits an experimental warning, ensure you are running Node 22+. When running on the JSON fallback, remove both `apps/backend/data/app.sqlite` and `apps/backend/data/app.sqlite.json` before restarting the server to trigger a clean seed.
