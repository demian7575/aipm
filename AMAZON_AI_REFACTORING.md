# Amazon AI Refactoring Summary

This document outlines the comprehensive refactoring of AIPM to use Amazon AI services instead of OpenAI/Codex.

## Overview

The refactoring replaces:
- **OpenAI ChatGPT** → **Amazon Bedrock (Claude 3 Sonnet)**
- **GitHub Codex** → **Amazon CodeWhisperer**

## Backend Changes

### New Files
- `apps/backend/amazon-ai.js` - Amazon Bedrock integration module

### Modified Files
- `apps/backend/app.js` - Updated to use Amazon AI services
- `package.json` - Added AWS SDK dependency

### Key Changes

#### 1. AI Configuration
```javascript
// Old (OpenAI)
function readOpenAiConfig() {
  const key = process.env.AI_PM_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  // ...
}

// New (Amazon Bedrock)
function readAmazonAiConfig() {
  const region = process.env.AWS_REGION || process.env.AI_PM_AWS_REGION || 'us-east-1';
  const model = process.env.AI_PM_BEDROCK_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0';
  // ...
}
```

#### 2. INVEST Analysis
- Replaced OpenAI API calls with Amazon Bedrock invocations
- Updated prompts for Claude 3 Sonnet model
- Changed source identifier from 'openai' to 'amazon-ai'

#### 3. Document Generation
- Migrated from OpenAI to Bedrock for document generation
- Updated prompts and response parsing for Claude format

#### 4. Acceptance Test Generation
- Replaced OpenAI with Bedrock for test generation
- Maintained same JSON response format

## Frontend Changes

### New Files
- `apps/frontend/public/amazon-codewhisperer.js` - CodeWhisperer integration

### Modified Files
- `apps/frontend/public/app.js` - Updated imports and function calls

### Key Changes

#### 1. Import Updates
```javascript
// Old
import { createDefaultCodexForm, validateCodexInput } from './codex.js';

// New  
import { createDefaultCodeWhispererForm, validateCodeWhispererInput } from './amazon-codewhisperer.js';
```

#### 2. UI Text Updates
- "Develop with Codex" → "Develop with Amazon CodeWhisperer"
- "Codex Delegations" → "CodeWhisperer Delegations"
- Updated branch naming: `aipm/codex/` → `aipm/codewhisperer/`

#### 3. Function Renames
- `createDefaultCodexForm()` → `createDefaultCodeWhispererForm()`
- `validateCodexInput()` → `validateCodeWhispererInput()`
- Storage key: `codexDelegations` → `codewhispererDelegations`

## Environment Variables

### New Variables (Amazon AI)
```bash
# Amazon Bedrock Configuration
AWS_REGION=us-east-1                    # AWS region for Bedrock
AI_PM_AWS_REGION=us-east-1             # Override AWS region
AI_PM_BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0  # Bedrock model
AI_PM_MAX_TOKENS=4000                   # Max tokens per request
AI_PM_TEMPERATURE=0.1                   # Model temperature
AI_PM_DISABLE_AMAZON_AI=false          # Disable Amazon AI

# AWS Credentials (use IAM roles in production)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Removed Variables (OpenAI)
```bash
# No longer needed
AI_PM_OPENAI_API_KEY
OPENAI_API_KEY
AI_PM_OPENAI_API_URL
AI_PM_OPENAI_MODEL
AI_PM_DISABLE_OPENAI
```

## Dependencies

### Added
- `@aws-sdk/client-bedrock-runtime` - Amazon Bedrock client

### Removed
- No OpenAI-specific dependencies were removed (none were previously used)

## AWS Permissions Required

The application now requires AWS credentials with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
      ]
    }
  ]
}
```

## Migration Steps

1. **Update Environment Variables**
   - Remove OpenAI API keys
   - Configure AWS credentials and region
   - Set Bedrock model preferences

2. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps @aws-sdk/client-bedrock-runtime
   ```

3. **Deploy Updated Code**
   ```bash
   npm run build
   serverless deploy  # For Lambda deployment
   ```

4. **Verify Integration**
   - Test INVEST analysis with Amazon Bedrock
   - Verify document generation works
   - Check acceptance test generation

## Benefits of Amazon AI Integration

1. **Cost Efficiency**: Amazon Bedrock pricing is competitive with OpenAI
2. **AWS Native**: Better integration with existing AWS infrastructure
3. **Security**: Data stays within AWS ecosystem
4. **Compliance**: Meets enterprise security requirements
5. **Performance**: Lower latency when deployed on AWS
6. **Model Choice**: Access to multiple foundation models (Claude, Titan, etc.)

## Backward Compatibility

- The API endpoints remain the same
- Response formats are maintained
- Frontend functionality is preserved
- Only the underlying AI provider has changed

## Testing

All existing tests should pass without modification. The AI integration is abstracted behind the same interfaces.

## Rollback Plan

If needed, the previous OpenAI integration can be restored by:
1. Reverting the code changes
2. Restoring OpenAI environment variables
3. Removing AWS SDK dependencies

## Future Enhancements

1. **Multi-Model Support**: Add support for other Bedrock models (Titan, Jurassic)
2. **Model Selection**: Allow users to choose models per request
3. **Cost Optimization**: Implement model routing based on request complexity
4. **Amazon Q Integration**: Add Amazon Q for code generation and analysis
