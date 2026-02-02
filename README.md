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
