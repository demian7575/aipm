# AI Project Manager (AIPM)

Mindmap workspace for user stories with AI code generation.

## What This Is

- **Frontend**: Vanilla JavaScript UI hosted on S3
- **Backend**: Node.js API running on EC2
- **Database**: DynamoDB (3 tables: stories, tests, PRs)
- **AI**: Kiro CLI generates code via Session Pool
- **Deploy**: GitHub Actions → EC2 + S3

## Quick Start

### Local Development

```bash
git clone https://github.com/demian7575/aipm.git
cd aipm
npm install
npm run dev  # Starts on http://localhost:4000
```

**Requirements**: Node.js 18+

### Deploy to AWS

```bash
./bin/deploy-prod prod  # Production
./bin/deploy-prod dev   # Development
```

**Requirements**: AWS CLI configured, SSH access to EC2

## Configuration

**Single source of truth**: `config/environments.yaml`

```yaml
prod:
  ec2_ip: "44.197.204.18"
  api_port: 4000
  semantic_api_port: 8083
  s3_bucket: "aipm-static-hosting-demo"
  dynamodb_stories_table: "aipm-backend-prod-stories"
  dynamodb_tests_table: "aipm-backend-prod-acceptance-tests"
  dynamodb_prs_table: "aipm-backend-prod-prs"
```

**Never hardcode IPs/ports** - always read from this file.

## Live Environments

**Production**:
- Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- API: http://44.197.204.18:4000
- Semantic API: http://44.197.204.18:8083

**Development**:
- Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- API: http://44.222.168.46:4000
- Semantic API: http://44.222.168.46:8083

## Using Kiro CLI

Kiro CLI loads `.kirocontext` automatically when you start it in this directory.

```bash
kiro-cli chat
```

That's it. Kiro knows the project structure and can answer questions or generate code.

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Setup guide
- **[Architecture](docs/ARCHITECTURE.md)** - System design
- **[Architecture Diagram](docs/ARCHITECTURE_BLOCK_DIAGRAM.md)** - Detailed diagram
- **[Deployment](docs/DEPLOYMENT.md)** - Deploy to AWS
- **[Testing](docs/TESTING.md)** - Run tests
- **[All Docs](docs/README.md)** - Complete index
- **[Configuration](docs/CONFIGURATION.md)** - Environment setup
- **[Architecture](docs/ARCHITECTURE.md)** - System design
- **[Development](docs/DEVELOPMENT.md)** - Development workflow
- **[Deployment](docs/DEPLOYMENT.md)** - Deployment guide
- **[Testing](docs/TESTING.md)** - Testing strategy
- **[API Reference](docs/API_REFERENCE.md)** - API endpoints

## 🌐 Live Environments

**Production:**
- Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- API: http://44.197.204.18:4000
- Semantic API: http://44.197.204.18:8083

**Development:**
- Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- API: http://44.222.168.46:4000
- Semantic API: http://44.222.168.46:8083

The deployment script automatically reads from this centralized configuration.

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

Start the development server:

```bash
npm run dev
```

This starts:
- **Backend API** on port 4000 (auto-retries next port if busy)
- **Frontend** served from `apps/frontend/public/`
- **Auto-reload** on file changes

### AI Code Generation

Two services run on EC2 (as systemd services):

```bash
# Semantic API (port 8083) - Template processor, SSE handler
node scripts/semantic-api-server-v2.js

# Session Pool (port 8082) - 4 persistent Kiro CLI sessions
node scripts/kiro-session-pool.js
```

**Flow**:
1. User clicks "Generate Code & PR"
2. Backend creates PR branch with TASK.md
3. Semantic API → Session Pool → Kiro CLI
4. Kiro generates code, pushes to PR branch
5. Progress streamed via SSE
6. Developer reviews and merges PR

**Key Facts**:
- In-memory queue (no DynamoDB polling)
- Direct HTTP communication
- 4 concurrent Kiro sessions max

## Data Storage

DynamoDB tables (production):
- `aipm-backend-prod-stories` - User stories
- `aipm-backend-prod-acceptance-tests` - Test cases
- `aipm-backend-prod-prs` - PR tracking

**Note**: SQLite compatibility layer exists for tests only. Production uses DynamoDB exclusively.
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

## Project Structure

```
apps/
  backend/
    app.js              # Main HTTP server + REST API
    server.js           # CLI entry point
    dynamodb.js         # DynamoDB data layer
    story-prs.js        # PR tracking
    github-pr-service.js # GitHub API integration
  frontend/public/
    index.html
    app.js              # UI logic (mindmap, outline, details)
    styles.css
scripts/
  semantic-api-server-v2.js  # AI template processor (port 8083)
  kiro-session-pool.js       # Kiro CLI manager (port 8082)
  deploy-to-environment.sh   # Deployment script
  testing/                   # Gating test suites
tests/
  backend.test.js     # API tests
config/
  environments.yaml   # Single source of truth for config
  *.service          # Systemd service definitions
```

## Testing

Run the Node.js test suite (using the built-in `node:test` harness) to exercise the REST API and SQLite persistence:

```bash
npm test
```

## Branching

All active development has been merged into the `main` branch; check out `main` to run the workspace locally or to build new
features on top of the latest codebase.

### Why does GitHub only show "Create pull request"?

In this repository approvals are handled through pull requests. GitHub will only display the **Update branch** button when you
are viewing an open pull request whose head branch is behind the base. If you are working directly on a branch without an
existing PR (or the branch is already up to date), GitHub shows the **Create pull request** button instead. To merge your
changes you should open a PR from your working branch into `main`, request the required approvals, and then complete the merge.

### User Story Status Reference

| Status       | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
### User Story Status Reference

| Status       | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| Draft        | Story is being authored or refined; requirements may still change.         |
| Ready        | Story satisfies INVEST checks with verifiable acceptance tests and is planning-ready. |
| In Progress  | Story is actively being implemented and validated by the delivery team.    |
| Blocked      | Story progress is impeded by external dependencies or unresolved issues.   |
| Approved     | Story has been reviewed and accepted for execution.                        |
| Done         | Story delivered; all descendant stories are Done and every acceptance test has status Pass. |

**Note**: The workspace enforces the Done status guard automatically—if a story has children that are not Done or any acceptance test that is not Pass, the API rejects the transition with actionable feedback.

## Scripts

| Command            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Start the API + frontend server (auto port fallback)       |
| `npm test`         | Execute the Node-based HTTP/API test suite                 |
| `npm run start`    | Alias for launching the production server (`server.js`)    |

## Support

The system uses DynamoDB for data storage and provides real-time updates across all connected clients.
