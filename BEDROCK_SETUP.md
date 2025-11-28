# Amazon Bedrock Setup for Code Generation

## Current Status
✅ Lambda has Bedrock permissions
✅ Bedrock SDK installed
⚠️ **Bedrock model access NOT enabled**

## Enable Bedrock Model Access

### Step 1: Go to Bedrock Console
https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

### Step 2: Request Model Access
1. Click "Manage model access" or "Edit"
2. Find "Claude 3 Sonnet" by Anthropic
3. Check the box next to it
4. Click "Request model access" or "Save changes"

### Step 3: Fill Out Use Case Form
- You'll be asked to describe your use case
- Example: "AI-powered code generation for development workflow automation"
- Submit the form

### Step 4: Wait for Approval
- Usually takes 5-15 minutes
- You'll receive email confirmation
- Status will change from "Pending" to "Access granted"

### Step 5: Test
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Create a hello world function"}'
```

## What Happens After Setup

Once Bedrock access is enabled:

1. User describes task in UI
2. Lambda calls Bedrock Claude 3 Sonnet
3. AI generates code
4. Lambda creates new branch
5. Lambda commits generated code
6. Lambda creates PR to develop
7. Human reviews and merges

## Current Behavior (Without Bedrock)

The endpoint returns:
```json
{
  "success": false,
  "message": "Bedrock model access required. Enable Claude 3 Sonnet in AWS Console → Bedrock → Model access"
}
```

## Alternative: Use Kiro CLI Locally

Instead of Bedrock, you can use Kiro (Amazon Q) CLI:
```bash
# In your IDE
kiro-cli chat
# Then use /dev command to generate code
# Manually commit and push
```

This doesn't require Bedrock setup but is manual.
