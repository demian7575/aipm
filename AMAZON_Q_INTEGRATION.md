# Amazon Q / CodeWhisperer Integration Guide

## Overview
Integrate Amazon Q (via Bedrock) to generate code and automatically create PRs in GitHub.

## Architecture

```
User Request → Lambda API → GitHub Actions → Amazon Bedrock → Generate Code → Create PR
```

## Setup Steps

### 1. Enable Amazon Bedrock Access
```bash
# Request model access in AWS Console
# Go to: Bedrock → Model access → Manage model access
# Enable: Claude 3 Sonnet
```

### 2. Update IAM Role for Lambda
Add Bedrock permissions to Lambda execution role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
    }
  ]
}
```

### 3. Add GitHub Token (if not done)
```bash
aws lambda update-function-configuration \
  --function-name aipm-backend-prod-api \
  --environment "Variables={GITHUB_TOKEN=YOUR_TOKEN,GITHUB_REPO=demian7575/aipm}" \
  --region us-east-1
```

### 4. Deploy Updated Code
```bash
cd /repo/ebaejun/tools/aws/aipm
bash deploy-prod-full.sh
```

## Usage

### Option 1: API Call
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{
    "taskDescription": "Add a new feature to export stories as PDF",
    "targetBranch": "develop"
  }'
```

### Option 2: GitHub Actions UI
1. Go to: https://github.com/demian7575/aipm/actions/workflows/q-code-generation.yml
2. Click "Run workflow"
3. Enter task description
4. Select target branch
5. Click "Run workflow"

### Option 3: From AIPM UI
Update the "Run in Staging" modal to include code generation:
```javascript
// In buildRunInStagingModalContent()
const generateBtn = document.createElement('button');
generateBtn.textContent = 'Generate Code with Amazon Q';
generateBtn.onclick = async () => {
  const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/generate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskDescription: prEntry.taskTitle,
      targetBranch: 'develop'
    })
  });
  const result = await response.json();
  console.log(result);
};
```

## How It Works

### Step 1: User Triggers Request
- Via API, GitHub UI, or AIPM interface
- Provides task description

### Step 2: Lambda Triggers GitHub Actions
- Validates GITHUB_TOKEN
- Calls GitHub Actions workflow dispatch API

### Step 3: GitHub Actions Runs
- Checks out code
- Calls Amazon Bedrock with task description
- Claude generates code

### Step 4: Code Review & PR
- Generated code saved to file
- Automatic PR created
- Team reviews before merging

## Example Workflow

**Task:** "Add export to Excel feature"

**Amazon Q generates:**
```javascript
// FILE: apps/frontend/public/export-excel.js
function exportToExcel(stories) {
  // Generated implementation
}
```

**Result:** PR created with generated code for review

## Testing

### Test Code Generation Endpoint
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Add unit tests for story export"}'
```

### Test Manual Workflow
1. Go to Actions tab
2. Run "Amazon Q Code Generation" workflow
3. Check for new PR

### Verify Bedrock Access
```bash
aws bedrock list-foundation-models --region us-east-1
```

## Integration with "Run in Staging"

You can combine both workflows:
1. **Generate Code** → Amazon Q creates code → PR created
2. **Review & Merge** → Team reviews PR
3. **Run in Staging** → Deploy to dev environment
4. **Test** → Verify in staging
5. **Deploy to Prod** → Merge to main

## Cost Considerations

- **Bedrock Claude 3 Sonnet**: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- **Typical code generation**: $0.05 - $0.20 per request
- **GitHub Actions**: Free for public repos, included minutes for private

## Security

✅ Code review required before merge
✅ Generated code in separate branch
✅ IAM permissions scoped to Bedrock only
✅ GitHub token with minimal scopes
❌ Never auto-merge generated code

## Limitations

- Bedrock model must be enabled in your AWS account
- Generated code requires human review
- Complex tasks may need multiple iterations
- Token limits apply (4K output tokens)

## Alternative: Local Amazon Q

For development, use Amazon Q in IDE:
1. Install Amazon Q extension (VS Code, JetBrains)
2. Use `/dev` command for code generation
3. Review and commit manually
4. Push to GitHub

This approach gives you more control but requires manual steps.
