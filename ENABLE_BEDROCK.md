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

## How to Enable Bedrock Model Access

### Step 1: Go to Model Access Page
**Direct Link:** https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

### Step 2: Request Model Access
1. Click **"Manage model access"** button (top right)
2. Scroll down to find **"Anthropic"** section
3. Check the box next to **"Claude 3 Haiku"**
   - Model ID: `anthropic.claude-3-haiku-20240307-v1:0`
   - This is the fastest and cheapest model
4. Optionally also enable:
   - Claude 3.5 Sonnet (better quality, more expensive)
   - Claude 3 Opus (best quality, most expensive)

### Step 3: Review and Submit
1. Scroll to bottom
2. Click **"Request model access"** or **"Save changes"**
3. You may need to fill out a use case form:
   - **Use case:** Development workflow automation
   - **Description:** AI-powered code generation for project management
   - **Industry:** Software Development

### Step 4: Wait for Approval
- **Time:** Usually 5-15 minutes (can be instant)
- **Status:** Check the "Access status" column
  - "In progress" → Wait
  - "Access granted" → Ready to use
- **Email:** You'll receive confirmation email

### Step 5: Verify Access
```bash
# Test Bedrock access
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  /tmp/test.json

# Should return success (not "Model use case details have not been submitted")
```

### Step 6: Test AIPM Code Generation
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Create a hello world function in hello.js"}'
```

**Expected response after approval:**
```json
{
  "success": true,
  "message": "Code generated and PR created",
  "prUrl": "https://github.com/demian7575/aipm/pull/XXX",
  "prNumber": XXX
}
```

## Cost Estimate

**Claude 3 Haiku pricing (cheapest):**
- Input: $0.00025 per 1K tokens
- Output: $0.00125 per 1K tokens
- **Average per code generation:** ~$0.01

**Monthly estimate:**
- 10 generations: ~$0.10
- 100 generations: ~$1.00
- 1000 generations: ~$10.00

**Claude 3.5 Sonnet (better quality):**
- ~5x more expensive (~$0.05 per generation)

## Troubleshooting

### "Model use case details have not been submitted"
**Solution:** Go to model access page and request access
**URL:** https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

### "Access denied" or "Not authorized"
**Solution:** IAM permissions issue
**Status:** Already fixed in AIPM (Lambda has bedrock:InvokeModel permission)

### "Model not found"
**Solution:** Wrong region
**Fix:** Must use us-east-1 region

### "Request still pending"
**Solution:** Wait 5-15 minutes
**Check:** Refresh model access page to see status

### Model access page shows "Access granted" but still getting error
**Solution:** Wait a few more minutes for propagation
**Try:** Test again after 5 minutes

## Alternative While Waiting for Approval

Use local script (works immediately):
```bash
cd /repo/ebaejun/tools/aws/aipm
./q-generate-and-pr.sh "Your task description"
```

This requires:
- Amazon Q CLI (kiro-cli) installed
- GitHub CLI (gh) installed
- Manual code generation with Q

## Summary

**AIPM is 100% ready to generate code automatically.**

**Only missing:** Bedrock model access approval

**To enable:**
1. Visit: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
2. Click "Manage model access"
3. Enable "Claude 3 Haiku"
4. Wait 5-15 minutes
5. Test with "Run in Staging" button

**Once enabled, AIPM will:**
- ✅ Generate code with AI
- ✅ Create PRs automatically
- ✅ Deploy to staging
- ✅ No local PC needed
- ✅ Fully automated workflow
