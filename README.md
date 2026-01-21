# AI Project Manager Mindmap

This repository contains a self-hosted mindmap and outline workspace for managing merge-request user stories, acceptance tests, and reference documentation. A Node.js backend exposes a SQLite-backed REST API and serves a vanilla JavaScript frontend that renders a right-expanding mindmap, outline tree, and detail panel with modal-driven editing flows.

## 📚 Development Documentation

**[📖 Complete Development Guide](docs/DevelopmentBackground.md)** - Comprehensive documentation including:
- Critical development principles (MUST READ before any changes)
- Core principles and regulations
- Complete code structure and AWS architecture
- API reference and workflow instructions
- Testing, troubleshooting, and lessons learned
- AI assistant integration guide

## 🚀 Quick Deploy to AWS

Deploy the complete AIPM web service with comprehensive testing:

```bash
./bin/deploy-prod
# or
./scripts/deploymen./bin/deploy-prod
```

This single command handles:
- ✅ Backend infrastructure (EC2 + DynamoDB)
- ✅ Frontend deployment (S3 static hosting)
- ✅ Configuration updates
- ✅ Health checks
- ✅ Production gating tests
- ✅ Deployment verification

**Live Demo**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
**API Endpoint**: http://3.92.96.67 (EC2 Backend)

**Development Environment**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
**Dev API Endpoint**: http://44.222.168.46 (EC2 Backend)

### Configuration

Customize deployment settings in `deploy-config.yaml`:

```yaml
deployment:
  stage: "prod"
  region: "us-east-1"
frontend:
  s3Bucket: "your-bucket-name"
```

> **Note**: If you encounter dependency conflicts, the script automatically handles `npm install --legacy-peer-deps`.

For detailed deployment instructions and troubleshooting, see the [Development Guide](docs/DevelopmentBackground.md).

## 📚 Additional Documentation

- **[🎓 Lessons Learned](docs/LESSONS_LEARNED.md)** - Critical development lessons and best practices
- **[🏗️ Current Architecture](docs/ARCHITECTURE_CURRENT_2025.md)** - Dual EC2 architecture overview
- **[🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE_2025.md)** - Updated deployment procedures
- **[📁 Code Structure](docs/CODE_STRUCTURE_2025.md)** - Comprehensive code analysis

## Requirements

- Node.js 18 or newer
- Python 3.8+ (optional, for development tools)
- macOS, Linux, or WSL shell with Bash-compatible tooling

> The project uses DynamoDB for data storage and relies entirely on Node.js built-ins for the frontend.

## Installation

Running `npm install` creates a lockfile for reproducibility. No packages are downloaded, so the command succeeds even in offline environments.

```bash
npm install

# Install Git hooks (recommended)
./scripts/install-hooks.sh
```

**Git Hooks**: The pre-commit hook prevents committing code with syntax errors. This is especially important for AI-generated code.

## Development

Launch the API server, delegation service, and static frontend with:

```bash
npm run dev
```

- The primary API binds to port `4000` by default and automatically retries on the next available port if the address is in use.
- A companion delegation server for GitHub automation starts alongside the API (default port `4100`).
- Static assets live under `apps/frontend/public/` and are served by the backend.

To run just one component, use `npm run serve:api` (workspace API + frontend) or `npm run serve:delegate` (delegation server only).

### Kiro Worker for AI Code Generation

The workspace includes a local worker that polls DynamoDB for code generation tasks and uses Kiro CLI to implement features automatically.

#### Starting the Worker

```bash
# Start the Kiro worker (runs continuously)
./scripts/workers/kiro-worker.sh
```

The worker:
- Polls `aipm-amazon-q-queue` DynamoDB table every 1 second
- Finds pending code generation tasks
- Checks out the PR branch
- Runs `kiro-cli chat` to generate code
- Commits and pushes changes to the PR
- Updates task status in DynamoDB

#### Workflow

1. User clicks "Generate Code & PR" in AIPM UI
2. Backend creates PR from main branch with TASK.md
3. Task added to DynamoDB queue
4. Local Kiro worker picks up task
5. Kiro generates code and pushes to PR branch
6. Developer reviews and merges PR

**Note**: The worker must run locally because Kiro CLI requires browser authentication.

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

Runtime data is stored in DynamoDB tables:
- `aipm-backend-prod-stories` - User stories and project data
- `aipm-backend-prod-acceptance-tests` - Acceptance tests linked to stories

Uploaded reference files are written to `apps/frontend/public/uploads/` and served back at `/uploads/<file>`. The system provides real-time updates and automatic synchronization across all connected clients.

### Sample dataset

For load testing or demos, you can import sample data to DynamoDB using the provided import scripts. The system includes sample datasets with hierarchical user stories and acceptance tests for testing purposes.

The development server seeds:

- A root story with INVEST-compliant metadata and acceptance test.
- A child story to demonstrate hierarchy.
- A reference document entry.

The database is automatically initialized if empty.

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

## Scripts

| Command            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Start the API + frontend server (auto port fallback)       |
| `npm run build`    | Copy backend/frontend assets into `dist/`                  |
| `npm test`         | Execute the Node-based HTTP/API test suite                 |
| `npm run start`    | Alias for launching the production server (`server.js`)    |

## Support

The system uses DynamoDB for data storage and provides real-time updates across all connected clients.
# Test commit Sun Jan 11 15:01:50 KST 2026
