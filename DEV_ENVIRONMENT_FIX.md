# Development Environment Fix

**Date:** 2025-12-01  
**Issue:** CORS error when accessing dev environment  
**Status:** ✅ RESOLVED

## Problem

The development frontend at `http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com` was unable to load stories due to CORS error:

```
Access to fetch at 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/dev/api/stories' 
from origin 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com' 
has been blocked by CORS policy
```

## Root Cause

Two issues were identified:

1. **Wrong API Gateway ID**: Frontend was configured to use `wk6h5fkqk9` (production API Gateway) with `/dev` stage, but that API Gateway only has `/prod` stage
2. **Wrong Lambda Handler**: Dev Lambda function had handler set to `apps/backend/app.handler` instead of `handler.handler`

## API Gateway Mapping

| Environment | API Gateway ID | Stage | Lambda Function |
|-------------|----------------|-------|-----------------|
| Production  | `wk6h5fkqk9`   | prod  | aipm-backend-prod-api |
| Development | `dka9vov9vg`   | dev   | aipm-backend-dev-api |

## Solution

### 1. Fixed Frontend Configuration

Updated `apps/frontend/public/config-dev.js`:

```javascript
window.CONFIG = {
    API_BASE_URL: 'https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev',
    apiEndpoint: 'https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev',
    // ... rest of config
};
```

### 2. Fixed Lambda Handler

```bash
aws lambda update-function-configuration \
  --function-name aipm-backend-dev-api \
  --handler handler.handler
```

### 3. Deployed Fixed Config

```bash
aws s3 cp apps/frontend/public/config-dev.js \
  s3://aipm-dev-frontend-hosting/config.js
```

## Verification

```bash
# Test API directly
curl https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev/api/stories
# Returns: []

# Check deployed config
curl http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/config.js
# Returns: Correct config with dka9vov9vg API Gateway ID
```

## Updated Deployment Script

The `deploy-dev-full.sh` script needs to be updated to use the correct API Gateway ID. The fallback logic should be:

```bash
# Get the correct dev API Gateway endpoint
API_ENDPOINT="https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev"
```

## Testing

Visit: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com

Expected behavior:
- ✅ No CORS errors
- ✅ Stories load successfully (empty array initially)
- ✅ All API calls work

## Prevention

To prevent this issue in the future:

1. Always verify API Gateway ID matches the stage
2. Ensure Lambda handler points to `handler.handler` (not `apps/backend/app.handler`)
3. Test API endpoint directly before deploying frontend
4. Update deployment scripts to use hardcoded correct endpoints instead of fallback logic
