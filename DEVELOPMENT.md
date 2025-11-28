# AIPM Development Guide

## Daily Routine

### Starting Development (Every Morning)
```bash
cd /repo/ebaejun/tools/aws/aipm
./start-dev.sh
```

This will:
- Pull latest changes from GitHub
- Update dependencies if needed
- Verify AWS credentials
- Check environment variables
- Show you what to do next

### Making Changes

1. **Edit files** in `apps/frontend/public/`
   - `app.js` - Main application logic
   - `styles.css` - Styling
   - `index.html` - HTML structure

2. **Deploy to test**
   ```bash
   ./deploy-dev-full.sh
   ```
   - Deploys to: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/

3. **Deploy to production**
   ```bash
   ./deploy-prod-complete.sh
   ```
   - Deploys to: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/

4. **Commit changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

## Key Scripts

| Script | Purpose |
|--------|---------|
| `./start-dev.sh` | Daily startup - pull changes, check environment |
| `./prepare-dev.sh` | First-time setup - install everything |
| `./deploy-dev-full.sh` | Deploy to development environment |
| `./deploy-prod-complete.sh` | Deploy to production (backend + frontend) |

## Environment Variables

Set these in your shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
export GITHUB_TOKEN="your_github_personal_access_token"
export AWS_PROFILE="default"  # or your AWS profile name
```

## Architecture

- **Backend**: AWS Lambda (Node.js) + API Gateway + DynamoDB
- **Frontend**: Static files on S3
- **AI**: Amazon Bedrock (Claude models)
- **CI/CD**: GitHub Actions

## Workflow: "Run in Staging"

1. Click "Run in Staging" on a PR card
2. Bedrock generates code → Creates PR on GitHub
3. Deploys PR branch to development environment
4. Test the changes live
5. Merge PR to develop when ready

## Troubleshooting

**Browser shows old version:**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or use Incognito mode

**AWS credentials error:**
```bash
aws configure
```

**GitHub token error:**
```bash
export GITHUB_TOKEN="your_token_here"
```

## Resources

- Dev Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- Prod Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- GitHub: https://github.com/demian7575/aipm
- Gating Tests: Open `production-gating-tests.html` in browser
