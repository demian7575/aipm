# AIPM Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured (`aws configure`)
- Git installed

## Setup Steps

### 1. Clone the Repository
```bash
git clone https://github.com/demian7575/aipm.git
cd aipm
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure AWS (if not done)
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
# Output format: json
```

### 4. Start Coding!

#### Option A: Local Development
```bash
# Run locally (port 4000)
npm run dev

# Open browser
open http://localhost:4000
```

#### Option B: Deploy to AWS Development
```bash
# Deploy complete dev environment
./deploy-dev-full.sh

# Open deployed app
open http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
```

## Development Workflow

### Make Changes
```bash
# Switch to develop branch
git checkout develop

# Make your changes
# ... edit files in apps/frontend/public/ or apps/backend/ ...

# Test locally
npm run dev
```

### Deploy & Test
```bash
# Deploy to development environment
./deploy-dev-full.sh

# Run gating tests
node run-comprehensive-gating-tests.cjs

# Or test in browser
open http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
```

### Commit & Push
```bash
git add .
git commit -m "Your feature description"
git push origin develop
```

## Project Structure

```
aipm/
├── apps/
│   ├── frontend/public/    # Frontend code (HTML, JS, CSS)
│   │   ├── index.html      # Main app
│   │   ├── app.js          # Core logic
│   │   └── styles.css      # Styling
│   └── backend/            # Backend API
│       ├── app.js          # Main API server
│       └── handler.js      # Lambda handler
├── deploy-dev-full.sh      # Deploy to dev
├── deploy-prod-full.sh     # Deploy to prod
└── DevelopmentBackground.md # Complete docs
```

## Common Commands

```bash
# Local development
npm run dev                              # Start local server

# Deployment
./deploy-dev-full.sh                     # Deploy to development
./deploy-prod-full.sh                    # Deploy to production

# Testing
node run-comprehensive-gating-tests.cjs  # Run all tests
npm test                                 # Run unit tests

# Logs
npx serverless logs -f api --stage dev --tail   # Dev logs
npx serverless logs -f api --stage prod --tail  # Prod logs
```

## Key URLs

- **Production**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
- **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
- **API**: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod

## Important Rules

1. **Always develop on `develop` branch** - Never commit directly to `main`
2. **Test in dev first** - Deploy to dev, test, then promote to prod
3. **Run gating tests** - Must pass before production deployment
4. **Read DevelopmentBackground.md** - Complete guide with principles and lessons learned

## Troubleshooting

### Port 4000 already in use
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or use different port
PORT=4001 npm run dev
```

### AWS credentials error
```bash
aws configure
# Re-enter your credentials
```

### Deployment fails
```bash
# Check AWS CLI is working
aws sts get-caller-identity

# Check serverless is installed
npx serverless --version
```

## Next Steps

1. Read [DevelopmentBackground.md](DevelopmentBackground.md) for complete documentation
2. Check [CRITICAL_PRINCIPLES](DevelopmentBackground.md#critical-development-principles) before making changes
3. Review [Lessons Learned](DevelopmentBackground.md#lessons-learned) to avoid common mistakes

## Need Help?

- **Complete docs**: [DevelopmentBackground.md](DevelopmentBackground.md)
- **API reference**: [DevelopmentBackground.md#api-reference](DevelopmentBackground.md#api-reference)
- **Troubleshooting**: [DevelopmentBackground.md#common-tasks--troubleshooting](DevelopmentBackground.md#common-tasks--troubleshooting)

---

**Ready to code? Run `npm run dev` and start building!** 🚀
