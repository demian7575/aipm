# Enable Amazon Bedrock for AIPM Code Generation

## Current Status
✅ AIPM backend ready with Bedrock integration
✅ IAM permissions configured
✅ SDK installed
❌ **Bedrock model access NOT enabled** (blocking code generation)

## The Problem

AWS Bedrock requires model access approval, but the process has changed in 2025.
The old "Model access" page may not exist or look different.

## Current Error
```
Model use case details have not been submitted for this account.
Fill out the Anthropic use case details form before using the model.
```

## Solution Options

### Option 1: AWS Console (Recommended)

**Try these URLs in order:**

1. **Main Bedrock Console:**
   https://console.aws.amazon.com/bedrock/home?region=us-east-1

2. **Model Access (if available):**
   https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

3. **Foundation Models:**
   https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/foundation-models

**What to look for:**
- "Get started" button
- "Enable models" or "Request access"
- "Foundation models" section
- Any mention of "Anthropic" or "Claude"
- Settings or configuration menu

**If you find model access:**
1. Enable "Claude 3 Haiku" (model ID: anthropic.claude-3-haiku-20240307-v1:0)
2. Fill out any use case form
3. Wait for approval

### Option 2: AWS CLI

Try requesting access via CLI:

```bash
# Create use case form data
cat > /tmp/bedrock-usecase.json << 'EOF'
{
  "useCaseDescription": "AI-powered code generation for AIPM project management system",
  "industry": "Software Development",
  "intendedUse": "Development workflow automation"
}
EOF

# Submit use case
aws bedrock put-use-case-for-model-access \
  --form-data file:///tmp/bedrock-usecase.json \
  --region us-east-1
```

### Option 3: AWS Support

If console UI is unclear:

1. Go to AWS Support Center
2. Create a case: "Enable Bedrock model access"
3. Request: "Please enable Claude 3 Haiku model access for account"
4. Include: Account ID and region (us-east-1)

### Option 4: Use Alternative (Works Now)

While waiting for Bedrock approval, use local script:

```bash
cd /repo/ebaejun/tools/aws/aipm
./q-generate-and-pr.sh "Your task description"
```

This works immediately without Bedrock.

## How to Test if Bedrock is Enabled

```bash
# Test Bedrock access
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  /tmp/test.json 2>&1

# If enabled: Returns success
# If not enabled: "Model use case details have not been submitted"
```

## Test AIPM Code Generation

Once Bedrock is enabled:

```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Create a hello world function"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Code generated and PR created",
  "prUrl": "https://github.com/demian7575/aipm/pull/XXX"
}
```

## What AIPM Will Do Once Enabled

1. Click "Run in Staging" button
2. AIPM calls Bedrock Claude AI
3. AI generates code based on task description
4. AIPM creates new branch
5. AIPM commits generated code
6. AIPM creates PR for review
7. AIPM deploys to staging
8. **Fully automated - no local PC needed**

## Cost Estimate

**Claude 3 Haiku (recommended):**
- ~$0.01 per code generation
- 100 generations/month = ~$1

## Current Workaround

Until Bedrock is enabled, use:

```bash
./q-generate-and-pr.sh "Your task"
```

This uses Amazon Q locally and creates PR automatically.

## Summary

**AIPM is ready for automated code generation.**

**Blocking issue:** Bedrock model access approval

**Next steps:**
1. Try AWS Console URLs above
2. Or use AWS CLI command
3. Or contact AWS Support
4. Or use local script workaround

**Once enabled:** Click "Run in Staging" and AIPM generates code automatically.
