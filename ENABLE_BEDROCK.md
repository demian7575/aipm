# Enable Amazon Bedrock for AIPM Code Generation

## Current Status
✅ AIPM backend ready with Bedrock integration
✅ IAM permissions configured
✅ SDK installed
❌ **Bedrock model access NOT enabled** (blocking code generation)

## What AIPM Will Do Once Enabled

When you click "Run in Staging":
1. **AIPM calls Bedrock** with task description
2. **Bedrock generates code** using Claude AI
3. **AIPM creates branch** in GitHub
4. **AIPM commits code** to branch
5. **AIPM creates PR** for review
6. **AIPM deploys** to staging environment

**Fully automated - no local PC needed.**

## How to Enable Bedrock

### Step 1: Go to Bedrock Console
https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/overview

### Step 2: Enable Model Access
1. Look for "Model access" or "Foundation models" in left menu
2. Click "Manage model access" or "Request access"
3. Find "Anthropic Claude" models
4. Check the box next to "Claude 3 Haiku" (fastest, cheapest)
5. Click "Request access" or "Save changes"

### Step 3: Fill Use Case Form
- **Use case:** AI-powered code generation for development workflow
- **Description:** Automated code generation for AIPM project management system
- Submit form

### Step 4: Wait for Approval
- Usually 5-15 minutes
- Check email for confirmation
- Status will change to "Access granted"

### Step 5: Test
```bash
# Test if Bedrock works
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Create a hello world function"}'
```

**Expected after approval:**
```json
{
  "success": true,
  "message": "Code generated and PR created",
  "prUrl": "https://github.com/demian7575/aipm/pull/XXX",
  "prNumber": XXX
}
```

## Cost Estimate

**Claude 3 Haiku pricing:**
- Input: $0.00025 per 1K tokens (~$0.001 per request)
- Output: $0.00125 per 1K tokens (~$0.005 per request)
- **Total: ~$0.01 per code generation**

**Monthly estimate (100 generations):** ~$1

## Alternative While Waiting

Use local script (works now):
```bash
cd /repo/ebaejun/tools/aws/aipm
./q-generate-and-pr.sh "Your task"
```

## Troubleshooting

**"Model use case details have not been submitted"**
→ Need to request model access in Bedrock console

**"Access denied"**
→ IAM permissions issue (already fixed in AIPM)

**"Model not found"**
→ Wrong region (must be us-east-1)

## Summary

**AIPM is ready to generate code automatically.**
**Just need to enable Bedrock model access in AWS Console.**

Once enabled, AIPM will:
- Generate code with AI
- Create PRs automatically  
- No local PC needed
- Fully automated workflow
