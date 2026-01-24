# Getting Started with AIPM

Complete guide to set up AIPM for development with Kiro CLI.

## Prerequisites

### Required

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **AWS CLI** configured
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region (us-east-1)
   ```

3. **Git**
   ```bash
   git --version
   ```

### Optional (for AI features)

4. **Kiro CLI**
   ```bash
   # Install Kiro CLI (if not already installed)
   # Follow: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-getting-started-installing.html
   
   kiro-cli --version
   ```

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/demian7575/aipm.git
cd aipm
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages for backend and frontend.

### 3. Verify Installation

```bash
# Check if all scripts are available
npm run

# You should see:
# - dev: Start development server
# - build: Build for production
# - test: Run tests
```

## Local Development

### Start Development Server

```bash
npm run dev
```

This starts:
- **Backend API** on http://localhost:4000
- **Frontend** served from backend
- **Auto-reload** on file changes

### Access the Application

Open your browser to: **http://localhost:4000**

You should see:
- Mindmap visualization
- Outline panel
- Story details panel

### Test the API

```bash
# Health check
curl http://localhost:4000/health

# List stories
curl http://localhost:4000/api/stories

# Create a test story
curl -X POST http://localhost:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story",
    "asA": "developer",
    "iWant": "to test the system",
    "soThat": "I can verify it works",
    "components": ["WorkModel"],
    "storyPoint": 2
  }'
```

## Configuration

### Environment Configuration

All settings are in `config/environments.yaml`:

```yaml
production:
  ec2_ip: "44.197.204.18"
  api_port: 4000
  semantic_api_port: 8083
  s3_bucket: "aipm-static-hosting-demo"
  dynamodb_stories_table: "aipm-backend-prod-stories"
  # ...

development:
  ec2_ip: "44.222.168.46"
  # ...
```

**To change IPs or ports**: Edit this file only.

### Local Environment Variables

Create `.env` file (optional):

```bash
# .env
ENVIRONMENT=development
AWS_REGION=us-east-1
```

## Enable AI Features (Optional)

To use AI-powered story generation and INVEST analysis:

### 1. Authenticate Kiro CLI

```bash
kiro-cli auth login
# Follow the browser authentication flow
```

### 2. Verify Kiro Context

The project includes `.kirocontext` file that Kiro automatically loads:

```bash
# Start Kiro in project directory
cd aipm
kiro-cli chat

# Kiro will automatically load project context
# Try asking:
# - "What is this project?"
# - "How do I add a new API endpoint?"
# - "Where is the INVEST validation?"
```

### 3. Start Semantic API Services (For Full AI Features)

```bash
# Terminal 1: Start Semantic API
node scripts/semantic-api-server-v2.js

# Terminal 2: Start Session Pool
node scripts/kiro-session-pool.js

# Terminal 3: Start Backend
npm run dev
```

### 4. Test AI Features

**In Kiro CLI:**
```bash
kiro-cli chat "Add a new endpoint to get stories by status"
kiro-cli chat "Review the INVEST validation logic"
```

**In AIPM UI:**
- Click "Create Child Story" → "Generate" with an idea
- Click "Run AI Check" on a story for INVEST analysis
- Click "Generate Test" for acceptance test generation

## Project Structure

```
aipm/
├── apps/
│   ├── backend/          # Node.js API server
│   │   ├── app.js        # Main application
│   │   ├── server.js     # Server entry point
│   │   └── dynamodb.js   # DynamoDB data layer
│   └── frontend/
│       └── public/       # Static frontend files
│           ├── index.html
│           ├── app.js    # Frontend logic
│           └── styles.css
├── config/
│   └── environments.yaml # Centralized configuration
├── docs/                 # Documentation
├── scripts/              # Utility scripts
│   ├── semantic-api-server-v2.js
│   ├── kiro-session-pool.js
│   └── testing/          # Test scripts
├── templates/            # AI prompt templates
└── tests/                # Unit tests
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit files in `apps/backend/` or `apps/frontend/public/`

### 3. Test Locally

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run gating tests
source scripts/utilities/load-env-config.sh production
./scripts/testing/phase1-security-data-safety.sh
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add my feature"
```

Pre-commit hooks will:
- Check JavaScript syntax
- Verify brace balance
- Prevent commits with syntax errors

### 5. Push and Create PR

```bash
git push origin feature/my-feature
# Create PR on GitHub
```

## Common Tasks

### Add a New API Endpoint

1. Edit `apps/backend/app.js`
2. Add route handler:
   ```javascript
   app.get('/api/my-endpoint', async (req, res) => {
     // Your logic here
     sendJson(res, 200, { data: 'response' });
   });
   ```
3. Test locally
4. Update `docs/API_REFERENCE.md`

### Modify Frontend UI

1. Edit `apps/frontend/public/app.js` or `styles.css`
2. Refresh browser (auto-reload enabled)
3. Test in different browsers

### Update Configuration

1. Edit `config/environments.yaml`
2. Restart services
3. Verify with health check

### Run Tests

```bash
# Unit tests
npm test

# Gating tests (requires deployed environment)
source scripts/utilities/load-env-config.sh production
./scripts/testing/run-structured-gating-tests.sh
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 4000
lsof -i :4000

# Kill process
kill -9 <PID>

# Or use different port
PORT=4001 npm run dev
```

### DynamoDB Connection Issues

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check region
aws configure get region

# List tables
aws dynamodb list-tables --region us-east-1
```

### Frontend Not Loading

```bash
# Check if backend is running
curl http://localhost:4000/health

# Check browser console for errors
# Open DevTools → Console
```

### Kiro CLI Not Working

```bash
# Check authentication
kiro-cli auth status

# Re-authenticate
kiro-cli auth login

# Check version
kiro-cli --version
```

## Next Steps

- **[Architecture](docs/ARCHITECTURE.md)** - Understand system design
- **[Development Guide](docs/DEVELOPMENT.md)** - Detailed development workflow
- **[API Reference](docs/API_REFERENCE.md)** - API documentation
- **[Deployment](docs/DEPLOYMENT.md)** - Deploy to AWS
- **[Testing](docs/TESTING.md)** - Testing strategy

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Create GitHub issue
- **Logs**: Check browser console and terminal output

## Quick Reference

```bash
# Start development
npm run dev

# Run tests
npm test

# Deploy to production
./bin/deploy-prod prod

# Deploy to development
./bin/deploy-prod dev

# Load environment config
source scripts/utilities/load-env-config.sh production

# Run gating tests
./scripts/testing/run-structured-gating-tests.sh
```

---

**Ready to develop!** 🚀

Start with `npm run dev` and open http://localhost:4000
