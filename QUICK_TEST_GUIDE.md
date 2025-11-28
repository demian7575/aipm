# Quick Test Guide - Run in Staging

## Current Status
✅ Code deployed to production
✅ GitHub Actions workflow created
⚠️ Needs GITHUB_TOKEN to trigger deployments

## Option 1: Test Without Full Setup (Recommended for Quick Test)

The endpoint works and gating tests pass. It just won't trigger actual deployment without token.

```bash
# Test endpoint (returns success without triggering deployment)
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/run-staging \
  -H "Content-Type: application/json" \
  -d '{"taskTitle":"Test deployment"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Staging endpoint ready (set GITHUB_TOKEN env var to enable auto-deployment)",
  "deploymentUrl": "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/",
  "branch": "develop",
  "githubUrl": "https://github.com/demian7575/aipm/tree/develop"
}
```

## Option 2: Full Setup with GitHub Actions (For Real Deployment)

### Step 1: Create GitHub Token
```bash
# Go to: https://github.com/settings/tokens
# Create token with 'repo' and 'workflow' scopes
# Copy the token (starts with ghp_)
```

### Step 2: Add Token to Lambda
```bash
aws lambda update-function-configuration \
  --function-name aipm-backend-prod-api \
  --environment "Variables={GITHUB_TOKEN=YOUR_TOKEN_HERE,GITHUB_REPO=demian7575/aipm}" \
  --region us-east-1
```

### Step 3: Add AWS Credentials to GitHub
```bash
# Go to: https://github.com/demian7575/aipm/settings/secrets/actions
# Add secrets:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
```

### Step 4: Test Manual Trigger
```bash
# Go to: https://github.com/demian7575/aipm/actions/workflows/deploy-staging.yml
# Click "Run workflow" button
# Watch deployment execute
```

### Step 5: Test API Trigger
```bash
# Same curl command as Option 1
# Now it will trigger GitHub Actions
```

## Option 3: Test UI Button

1. Open: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
2. Click any PR card's "Run in Staging" button
3. Watch workflow execute in modal
4. Check deployment URL

## Verification

### Check Gating Tests
```bash
cd /repo/ebaejun/tools/aws/aipm
node run-comprehensive-gating-tests.cjs
```

Expected: All tests pass (10/10 production, 9/9 development)

### Check GitHub Actions
https://github.com/demian7575/aipm/actions

### Check Deployment
http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/

## What Works Now

✅ Endpoint exists and responds
✅ Gating tests pass
✅ UI button functional
✅ GitHub Actions workflow ready
⏳ Needs token for auto-deployment

## Recommendation

**For testing/demo**: Use Option 1 - everything works, just doesn't trigger actual deployment

**For production use**: Use Option 2 - full automation with GitHub Actions
