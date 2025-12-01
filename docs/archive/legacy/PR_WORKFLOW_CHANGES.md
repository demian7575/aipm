# PR Workflow Changes - Implementation Summary

**Date:** 2025-11-30  
**Status:** ✅ Deployed to Production

## Overview

Changed the PR workflow from `PR → develop → main` to `PR → main` with staging deployment capability.

## Changes Implemented

### 1. Backend Changes

#### New Endpoint: `/api/deploy-pr`
- **Location:** `apps/backend/app.js`
- **Function:** `handleDeployPRRequest()`
- **Purpose:** Triggers GitHub Actions workflow to deploy PR branch to development environment
- **Parameters:**
  - `prNumber` (optional): PR number to deploy
  - `branchName` (optional): Branch name to deploy
- **Response:**
  ```json
  {
    "success": true,
    "message": "Deployment to staging triggered",
    "stagingUrl": "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com",
    "workflowUrl": "https://github.com/demian7575/aipm/actions"
  }
  ```

### 2. Frontend Changes

#### Updated Files:
- **`apps/frontend/public/app.js`**
  - Updated `buildRunInStagingModalContent()`: Changed workflow from develop to main
  - Updated `bedrockImplementation()`: Now calls `/api/deploy-pr` endpoint
  - Simplified deployment flow (removed task details modal)
  
- **`apps/frontend/public/simple-pr.js`**
  - Added `deployPRToStaging()` function
  - Added `createDeployToStagingButton()` component

#### UI Changes:
- "Run in Staging" button now available in PR cards
- Modal shows simplified deployment workflow:
  1. Deploy PR branch to development environment
  2. Test changes in staging
  3. After approval, merge PR to main
  4. Deploy to production

### 3. GitHub Actions Workflow

#### New File: `.github/workflows/deploy-pr-to-dev.yml`
- **Trigger:** Manual workflow dispatch via API
- **Inputs:**
  - `pr_number`: PR number to deploy
  - `branch_name`: Branch name to deploy
- **Steps:**
  1. Checkout PR branch
  2. Setup Node.js 18
  3. Install dependencies
  4. Configure AWS credentials
  5. Deploy backend to dev (`npx serverless deploy --stage dev`)
  6. Create dev config
  7. Deploy frontend to S3 (`aipm-dev-frontend-hosting`)
  8. Comment on PR with staging URL

### 4. ECS Worker Changes

#### Updated File: `q-worker.sh`
- **Change:** PR base branch changed from `develop` to `main`
- **Line 107:** `"base":"main"` (was `"base":"develop"`)

## New Workflow

### Before (Old Workflow)
```
User Story → Create PR (to develop) → Manual testing → Merge to develop → 
Merge to main → Deploy to production
```

### After (New Workflow)
```
User Story → Create PR (to main) → Run in Staging → Test in dev → 
Approve PR → Merge to main → Deploy to production
```

## Benefits

1. **Simplified Branch Strategy:** Direct PRs to main, no intermediate develop branch
2. **Staging Testing:** Test PR changes in development environment before merge
3. **Faster Feedback:** Deploy and test specific PR branches without affecting main
4. **Better Isolation:** Each PR can be tested independently in staging
5. **Production-Ready:** Only tested and approved code merges to main

## Usage

### For Developers

1. **Create PR:**
   - Click "Create PR" button in story card
   - Amazon Q generates code and creates PR to main

2. **Test in Staging:**
   - Click "Run in Staging" button in PR card
   - System deploys PR branch to development environment
   - Test at: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com

3. **Approve & Merge:**
   - After testing, approve PR on GitHub
   - Merge to main
   - Deploy to production with `./deploy-prod-full.sh`

### API Usage

```bash
# Deploy PR to staging
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/deploy-pr \
  -H "Content-Type: application/json" \
  -d '{"prNumber": 123, "branchName": "feature/my-feature"}'
```

## Testing

### Manual Testing Checklist
- [x] Create PR button creates PR to main (not develop)
- [x] Run in Staging button appears in PR cards
- [x] Clicking Run in Staging triggers deployment
- [x] GitHub Actions workflow executes successfully
- [x] PR branch deploys to development environment
- [x] Staging URL accessible after deployment
- [x] Backend endpoint `/api/deploy-pr` works correctly

### Automated Testing
- Production gating tests: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
- Development gating tests: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html

## Deployment

### Production Deployment
```bash
git checkout main
git pull origin main
AWS_PROFILE=myaws ./deploy-prod-full.sh
```

**Deployed:** 2025-11-30 00:04 JST  
**Commit:** d49590e8  
**Status:** ✅ Live in production

## Resources

- **Production:** http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Development:** http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **API:** https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
- **GitHub:** https://github.com/demian7575/aipm

## Next Steps

1. Test the new workflow with a real user story
2. Monitor GitHub Actions for deployment success
3. Update documentation to reflect new workflow
4. Train team on new PR → main workflow

## Rollback Plan

If issues occur:
```bash
git checkout main
git reset --hard 48e2c92a  # Previous commit
git push origin main --force
AWS_PROFILE=myaws ./deploy-prod-full.sh
```

---

**Implementation Complete** ✅
