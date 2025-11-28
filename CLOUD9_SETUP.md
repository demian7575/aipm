# AIPM Development with AWS Cloud9

Complete guide to develop AIPM in AWS Cloud9 (no local environment needed).

## Why Cloud9?

- ✅ Browser-based IDE
- ✅ AWS credentials pre-configured
- ✅ Full terminal access
- ✅ Can run local dev server
- ✅ Direct AWS deployment
- ✅ Persistent environment

## Setup (One Time - 10 minutes)

### 1. Create Cloud9 Environment

1. Go to https://console.aws.amazon.com/cloud9/
2. Click **Create environment**
3. Configure:
   - **Name**: `AIPM-Development`
   - **Instance type**: `t3.small` (2GB RAM, sufficient for AIPM)
   - **Platform**: `Amazon Linux 2023`
   - **Timeout**: `30 minutes` (auto-hibernates to save cost)
4. Click **Create**
5. Wait 2-3 minutes for environment to start

### 2. Clone AIPM Repository

```bash
# In Cloud9 terminal (bottom panel)
cd ~/environment
git clone https://github.com/demian7575/aipm.git
cd aipm
```

### 3. Install Dependencies

```bash
# Install project dependencies
npm install

# Install Serverless Framework (for deployment)
npm install -g serverless

# Install Kiro CLI (for AI-assisted development)
npm install -g @aws/kiro-cli
```

### 4. Verify Setup

```bash
# Check Node.js version (should be 18+)
node --version

# Check AWS credentials (pre-configured in Cloud9)
aws sts get-caller-identity

# Check AIPM is ready
ls -la
```

## Development Workflow

### Start Local Development Server

```bash
# Start AIPM locally
npm run dev

# Cloud9 will show a preview URL
# Click "Preview" → "Preview Running Application"
# Or use the URL shown in terminal
```

### Access Local AIPM

Cloud9 provides a preview URL like:
```
https://abc123.vfs.cloud9.us-east-1.amazonaws.com/
```

Click **Preview** → **Preview Running Application** in Cloud9 menu.

### Make Changes

1. Edit files in Cloud9 editor (left panel)
2. Changes auto-save
3. Refresh preview to see updates

**Key files:**
- `apps/frontend/public/app.js` - Frontend logic
- `apps/frontend/public/styles.css` - Styling
- `apps/backend/app.js` - Backend API

### Deploy to AWS

```bash
# Deploy to development environment
./deploy-dev-full.sh

# Deploy to production environment
./deploy-prod-full.sh
```

### Run Tests

```bash
# Run comprehensive gating tests
node run-comprehensive-gating-tests.cjs

# Run unit tests
npm test
```

## Using Kiro CLI in Cloud9

### Start Kiro Session

```bash
cd ~/environment/aipm
kiro-cli chat
```

### Load AIPM Context

```
I'm working on AIPM at ~/environment/aipm

Key files:
- Frontend: apps/frontend/public/app.js
- Backend: apps/backend/app.js
- Docs: DevelopmentBackground.md

Tech: Node.js, Vanilla JS, AWS Lambda, DynamoDB
```

### Vibe Code with Kiro

```
Add a dark mode toggle to the header
```

```
Create a search bar to filter stories by title
```

```
Add export to Excel functionality
```

Kiro will generate code, create files, and you just review and deploy!

## Git Workflow in Cloud9

### Configure Git (First Time)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Standard Workflow

```bash
# Switch to develop branch
git checkout develop
git pull origin develop

# Make changes (via Kiro or manual editing)

# Commit changes
git add .
git commit -m "Add feature: description"

# Push to GitHub
git push origin develop

# Deploy to dev
./deploy-dev-full.sh
```

## Cloud9 Tips & Tricks

### Preview Running Application

1. Start dev server: `npm run dev`
2. Click **Preview** → **Preview Running Application**
3. Opens in Cloud9 panel or new tab

### Open Multiple Terminals

- Click **+** next to terminal tab
- Run multiple commands simultaneously
- Example: One for `npm run dev`, one for Kiro

### File Navigation

- **Ctrl+P**: Quick file search
- **Ctrl+F**: Find in file
- **Ctrl+Shift+F**: Find in all files

### Save Costs

Cloud9 auto-hibernates after 30 minutes of inactivity:
- ✅ No charges when hibernated
- ✅ All files preserved
- ✅ Resumes in ~30 seconds

**Manual stop:**
```bash
# Stop environment from AWS Console
# Or let it auto-hibernate
```

## Troubleshooting

### Port 4000 Already in Use

```bash
# Kill existing process
lsof -ti:4000 | xargs kill -9

# Or use different port
PORT=4001 npm run dev
```

### AWS Credentials Error

Cloud9 credentials should work automatically. If not:
```bash
# Check credentials
aws sts get-caller-identity

# If fails, configure manually
aws configure
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules
npm install
```

### Preview Not Working

```bash
# Ensure server is running
npm run dev

# Check the port (should be 4000)
# Click Preview → Preview Running Application
# Or manually open: https://[your-env-id].vfs.cloud9.[region].amazonaws.com/
```

## Cost Optimization

### Estimated Costs

- **t3.small**: ~$0.023/hour = ~$0.55/day (24 hours)
- **With auto-hibernate**: ~$0.10/day (4 hours active)
- **Storage (10GB)**: ~$0.10/month

**Total**: ~$3-15/month depending on usage

### Save Money

1. **Enable auto-hibernate** (default 30 min)
2. **Stop when not using** (AWS Console → Cloud9 → Stop)
3. **Delete when done** (can recreate anytime)

## Quick Reference

```bash
# Start development
cd ~/environment/aipm
npm run dev

# Start Kiro
kiro-cli chat

# Deploy to dev
./deploy-dev-full.sh

# Deploy to prod
./deploy-prod-full.sh

# Run tests
node run-comprehensive-gating-tests.cjs

# View logs
npx serverless logs -f api --stage dev --tail
```

## Next Steps

1. ✅ Cloud9 environment created
2. ✅ AIPM cloned and installed
3. ✅ Start coding: `npm run dev`
4. ✅ Use Kiro: `kiro-cli chat`
5. ✅ Deploy: `./deploy-dev-full.sh`

## Resources

- **Cloud9 Console**: https://console.aws.amazon.com/cloud9/
- **AIPM Docs**: [DevelopmentBackground.md](DevelopmentBackground.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)

---

**You're ready to develop AIPM in the cloud!** ☁️🚀
