# AIPM Development with GitHub Codespaces

Complete guide to develop AIPM using GitHub Codespaces.

## Quick Start (5 minutes)

### 1. Create Codespace

1. Go to https://github.com/demian7575/aipm
2. Click **Code** button (green)
3. Click **Codespaces** tab
4. Click **Create codespace on main**
5. Wait 1-2 minutes for environment to start

### 2. Install Dependencies

```bash
# Terminal opens automatically in VS Code
npm install

# Install global tools
npm install -g serverless @aws/kiro-cli
```

### 3. Configure AWS (Required!)

```bash
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: wJalr...
# Default region: us-east-1
# Default output: json
```

### 4. Start Developing

```bash
# Start local dev server
npm run dev

# Codespaces will show a popup:
# "Your application running on port 4000 is available"
# Click "Open in Browser"
```

## Development Workflow

### Make Changes

1. Edit files in VS Code (left panel)
2. Changes auto-save
3. Refresh browser to see updates

**Key files:**
- `apps/frontend/public/app.js` - Frontend
- `apps/backend/app.js` - Backend
- `apps/frontend/public/styles.css` - Styling

### Deploy to AWS

```bash
# Deploy to development
./deploy-dev-full.sh

# Deploy to production
./deploy-prod-full.sh
```

### Run Tests

```bash
# Comprehensive gating tests
node run-comprehensive-gating-tests.cjs

# Unit tests
npm test
```

## Using Kiro CLI

```bash
# Start Kiro
kiro-cli chat

# Load context
I'm working on AIPM
Frontend: apps/frontend/public/app.js
Backend: apps/backend/app.js

# Vibe code
Add a dark mode toggle
```

## Git Workflow

### Codespaces has Git pre-configured!

#### Via VS Code UI (Recommended)
1. Make changes
2. Click Source Control icon (left sidebar)
3. Enter commit message
4. Click ✓ Commit
5. Click ... → Push

#### Via Terminal
```bash
git checkout develop
git add .
git commit -m "Add feature"
git push origin develop
```

## Codespaces Features

### Port Forwarding

When you run `npm run dev`, Codespaces automatically:
- Detects port 4000
- Shows popup to open in browser
- Creates secure tunnel

### VS Code Extensions

Install useful extensions:
- ESLint
- Prettier
- GitLens
- AWS Toolkit

### Multiple Terminals

- Click **+** in terminal panel
- Run multiple commands
- Example: One for `npm run dev`, one for Kiro

## Cost Management

### Free Tier
- **60 hours/month** free
- **15GB storage** free
- Resets monthly

### After Free Tier
- **$0.18/hour** for 4-core machine
- Auto-stops after 30 min idle
- Can manually stop anytime

### Check Usage
```bash
# Go to GitHub Settings
https://github.com/settings/billing

# View Codespaces usage
```

### Save Money
1. **Stop when not using**: Codespaces → ... → Stop
2. **Delete unused**: Codespaces → ... → Delete
3. **Use smaller machine**: 2-core instead of 4-core

## Troubleshooting

### Port 4000 Not Opening

```bash
# Check if server is running
npm run dev

# Manually open port
# Ports tab (bottom) → Forward Port → 4000
```

### AWS Credentials Error

```bash
# Reconfigure AWS
aws configure

# Test credentials
aws sts get-caller-identity
```

### Out of Storage

```bash
# Check disk usage
df -h

# Clean npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules
npm install
```

### Codespace Won't Start

1. Delete the codespace
2. Create a new one
3. Your code is safe in GitHub

## Tips & Tricks

### Keyboard Shortcuts
- **Ctrl+P**: Quick file search
- **Ctrl+Shift+P**: Command palette
- **Ctrl+`**: Toggle terminal
- **Ctrl+B**: Toggle sidebar

### Settings Sync
- Sign in to VS Code
- Settings sync across codespaces
- Extensions sync automatically

### Dotfiles
Create `.devcontainer/devcontainer.json`:
```json
{
  "postCreateCommand": "npm install && npm install -g serverless @aws/kiro-cli"
}
```

## Comparison with Cloud9

| Feature | Codespaces | Cloud9 |
|---------|------------|--------|
| **IDE** | VS Code ⭐⭐⭐⭐⭐ | Basic ⭐⭐⭐ |
| **AWS Setup** | Manual ⭐⭐⭐ | Auto ⭐⭐⭐⭐⭐ |
| **Cost (60h)** | Free ⭐⭐⭐⭐⭐ | ~$1.40 ⭐⭐⭐⭐ |
| **Cost (160h)** | ~$18 ⭐⭐⭐ | ~$3.70 ⭐⭐⭐⭐⭐ |
| **Git** | Integrated ⭐⭐⭐⭐⭐ | Manual ⭐⭐⭐ |

**Use Codespaces if:**
- You prefer VS Code
- You work <60 hours/month
- You want better IDE

**Use Cloud9 if:**
- You deploy to AWS frequently
- You work full-time
- You want lower cost

## Quick Reference

```bash
# Start development
npm run dev

# Start Kiro
kiro-cli chat

# Deploy
./deploy-dev-full.sh
./deploy-prod-full.sh

# Test
node run-comprehensive-gating-tests.cjs

# Git
git add .
git commit -m "message"
git push
```

## Resources

- **Codespaces**: https://github.com/codespaces
- **AIPM Docs**: [DevelopmentBackground.md](DevelopmentBackground.md)
- **Comparison**: [CLOUD_DEV_COMPARISON.md](CLOUD_DEV_COMPARISON.md)

---

**Ready to code in Codespaces!** 🚀
