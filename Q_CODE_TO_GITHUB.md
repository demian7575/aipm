# Can Amazon Q Generate Code and Push to GitHub?

## Short Answer: YES ✅

I've set up **2 workflows** for you:

## 1. Deploy to Staging (Already Working)
**What it does:** Deploys your code to development environment

**How to use:**
```bash
# Manual trigger
https://github.com/demian7575/aipm/actions/workflows/deploy-staging.yml

# Or via API
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/run-staging \
  -H "Content-Type: application/json" \
  -d '{"taskTitle":"Deploy to staging"}'
```

## 2. Amazon Q Code Generation (NEW)
**What it does:** Uses Amazon Q (Bedrock) to generate code and create PR

**How to use:**
```bash
# Manual trigger
https://github.com/demian7575/aipm/actions/workflows/q-code-generation.yml

# Or via API
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Add PDF export feature"}'
```

## Setup Required (5 minutes)

### For Staging Deployment:
1. Create GitHub token: https://github.com/settings/tokens (needs `repo` + `workflow`)
2. Add to Lambda:
```bash
aws lambda update-function-configuration \
  --function-name aipm-backend-prod-api \
  --environment "Variables={GITHUB_TOKEN=YOUR_TOKEN,GITHUB_REPO=demian7575/aipm}" \
  --region us-east-1
```

### For Amazon Q Code Generation:
1. Enable Bedrock Claude in AWS Console
2. Add Bedrock permissions to Lambda IAM role
3. Same GitHub token as above

## How It Works

### Staging Deployment Flow:
```
User clicks button → API call → GitHub Actions → deploy-dev-full.sh → Code deployed
```

### Code Generation Flow:
```
User describes task → API call → GitHub Actions → Amazon Bedrock → Generate code → Create PR
```

## Test Now (No Setup Needed)

Both workflows are already in GitHub. You can test manually:

1. **Staging Deploy:** https://github.com/demian7575/aipm/actions/workflows/deploy-staging.yml
2. **Code Generation:** https://github.com/demian7575/aipm/actions/workflows/q-code-generation.yml

Click "Run workflow" on either one.

## Files Created
- `.github/workflows/deploy-staging.yml` - Staging deployment
- `.github/workflows/q-code-generation.yml` - Amazon Q code generation
- `AMAZON_Q_INTEGRATION.md` - Detailed guide
- `STAGING_WORKFLOW_SETUP.md` - Setup instructions

## Already Pushed to GitHub ✅
All code is committed and pushed to: https://github.com/demian7575/aipm

## Next Steps

**Option A (Quick Test):** Go to Actions tab and run workflows manually

**Option B (Full Setup):** Follow setup steps above for API integration

**Option C (Use Kiro/Q Locally):** Use Amazon Q in your IDE with `/dev` command
