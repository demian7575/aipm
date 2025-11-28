# AIPM Development Setup with Kiro CLI

## Quick Start from Kiro CLI

### Step 1: Navigate to AIPM
```bash
cd /repo/ebaejun/tools/aws/aipm
```

### Step 2: Load Context
```bash
# Read the main guide
cat START_HERE.md

# Or load AI context
cat AI_ASSISTANT_PROMPT.md
```

### Step 3: Verify Environment
```bash
# Check Node.js version (need 18+)
node --version

# Check AWS CLI
aws --version

# Check current branch
git branch
```

### Step 4: Install Dependencies (if needed)
```bash
npm install
```

### Step 5: Deploy Development Environment
```bash
./deploy-dev-full.sh
```

### Step 6: Start Developing
```bash
# Switch to develop branch
git checkout develop

# Make your changes
# ... edit files ...

# Deploy and test
./deploy-dev-full.sh
```

## One-Line Setup

```bash
cd /repo/ebaejun/tools/aws/aipm && cat START_HERE.md && git checkout develop
```

## Context Loading for Kiro

When starting a new Kiro session, paste this:

```
I'm working on AIPM (AI Project Manager) at /repo/ebaejun/tools/aws/aipm

Please read these files to understand the project:
1. START_HERE.md - Main development guide
2. DEPLOYMENT_STRATEGY.md - Deployment details
3. DEVELOPMENT_PRINCIPLES.md - Core principles
4. LESSONS_LEARNED.md - Key insights

Key points:
- Complete environment isolation (dev/prod)
- Always test in dev first: ./deploy-dev-full.sh
- Deploy to prod only after verification: ./deploy-prod-full.sh
- Manual browser testing is mandatory
- Write minimal code only

Current directory: /repo/ebaejun/tools/aws/aipm
```

## Quick Commands Reference

```bash
# Deploy
./deploy-dev-full.sh          # Deploy complete dev environment
./deploy-prod-full.sh         # Deploy complete prod environment

# Test
node run-comprehensive-gating-tests.cjs

# Logs
npx serverless logs -f api --stage dev --tail

# Update docs
./update-start-here.sh "Your update message"
```

## Environment URLs

- **Dev**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Prod**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/

## Workflow

```bash
# 1. Develop
git checkout develop
# ... make changes ...
git push origin develop

# 2. Deploy to dev
./deploy-dev-full.sh

# 3. Test
# Open dev URL in browser
# Run gating tests

# 4. Promote to prod
git checkout main
git merge develop
git push origin main

# 5. Deploy to prod
./deploy-prod-full.sh
```

---

**Ready to start? Run:**
```bash
cd /repo/ebaejun/tools/aws/aipm && ./deploy-dev-full.sh
```
