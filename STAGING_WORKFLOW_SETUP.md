# Run in Staging Workflow - Setup Guide

## Overview
The "Run in Staging" feature triggers GitHub Actions to deploy code to the development environment.

## Setup Steps

### 1. Create GitHub Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `AIPM Staging Deployment`
4. Scopes: Select `repo` and `workflow`
5. Click "Generate token"
6. **Copy the token** (you won't see it again)

### 2. Add Token to Lambda Environment Variables
```bash
# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name aipm-backend-prod-api \
  --environment "Variables={GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE,GITHUB_REPO=demian7575/aipm}" \
  --region us-east-1
```

Or via AWS Console:
1. Go to Lambda → aipm-backend-prod-api
2. Configuration → Environment variables → Edit
3. Add:
   - Key: `GITHUB_TOKEN`, Value: `ghp_YOUR_TOKEN_HERE`
   - Key: `GITHUB_REPO`, Value: `demian7575/aipm`
4. Save

### 3. Add AWS Credentials to GitHub Secrets
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

### 4. Deploy Updated Code
```bash
cd /repo/ebaejun/tools/aws/aipm
bash deploy-prod-full.sh
```

## How It Works

### Without GITHUB_TOKEN (Current State)
- Endpoint returns success but doesn't trigger deployment
- Gating tests pass
- Manual deployment required

### With GITHUB_TOKEN (Full Automation)
1. User clicks "Run in Staging" button in UI
2. Frontend calls `/api/run-staging` endpoint
3. Lambda triggers GitHub Actions workflow
4. GitHub Actions executes `deploy-dev-full.sh`
5. Development environment updated
6. User sees deployment URL

## Testing

### Test Without Token (Current)
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/run-staging \
  -H "Content-Type: application/json" \
  -d '{"taskTitle":"Test deployment"}'
```

Expected: `"success": true` with message about GITHUB_TOKEN

### Test With Token (After Setup)
Same curl command, but response will show "triggered via GitHub Actions"

### Manual GitHub Actions Test
1. Go to: https://github.com/demian7575/aipm/actions
2. Click "Deploy to Staging" workflow
3. Click "Run workflow"
4. Enter task title (optional)
5. Click "Run workflow"
6. Watch deployment progress

## Verification
After deployment completes:
- Check: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- Verify changes are live

## Troubleshooting

### "GITHUB_TOKEN not set"
- Add token to Lambda environment variables (Step 2)

### "GitHub Actions trigger failed: 404"
- Check GITHUB_REPO environment variable
- Verify token has `workflow` scope

### "Deployment failed in GitHub Actions"
- Check AWS credentials in GitHub Secrets
- View logs: https://github.com/demian7575/aipm/actions

## Security Notes
- Never commit GITHUB_TOKEN to code
- Use GitHub Secrets for AWS credentials
- Rotate tokens periodically
- Use least-privilege IAM roles
