# Amazon Q Code Generation with PR Review

## What It Does
Amazon Q generates code → Creates PR → Human reviews → Merge to develop ✅

## Flow
```
1. Describe task
2. Amazon Q generates code
3. PR created automatically
4. Human reviews and updates if needed
5. Merge to develop when ready
```

## Setup (One Time)

### 1. Enable Bedrock
```bash
# AWS Console → Bedrock → Model access → Enable Claude 3 Sonnet
```

### 2. Add GitHub Token to Lambda
```bash
aws lambda update-function-configuration \
  --function-name aipm-backend-prod-api \
  --environment "Variables={GITHUB_TOKEN=YOUR_TOKEN,GITHUB_REPO=demian7575/aipm}" \
  --region us-east-1
```

### 3. Add AWS Credentials to GitHub
```bash
# GitHub repo → Settings → Secrets → Actions
# Add: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

## Usage

### Option 1: API Call
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Add PDF export feature"}'
```

### Option 2: GitHub UI
1. Go to: https://github.com/demian7575/aipm/actions/workflows/q-code-generation.yml
2. Click "Run workflow"
3. Enter task description
4. Click "Run workflow"

## What Happens

```
1. Amazon Q generates code
2. PR created: amazonq/[number] → develop
3. You review the PR
4. Update code if Amazon Q made mistakes
5. Merge when satisfied
```

## Example

**Input:** "Add export to Excel feature"

**Output:** 
- PR created with generated code
- Title: "🤖 Amazon Q: Add export to Excel feature"
- You review, test, update if needed
- Merge to develop

## Review PR

1. Check PRs: https://github.com/demian7575/aipm/pulls
2. Review code changes
3. Test locally if needed:
   ```bash
   git fetch origin
   git checkout amazonq/123
   npm install
   npm test
   ```
4. Update code directly in PR if needed
5. Merge when ready

## Test Now

https://github.com/demian7575/aipm/actions/workflows/q-code-generation.yml

Click "Run workflow" and enter task description.
Check PRs tab for the generated PR.
