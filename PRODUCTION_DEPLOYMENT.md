# Production Deployment Automation

## Overview

When a PR is merged to the `main` branch, the AIPM application is automatically deployed to the production environment. This ensures that the production service page is always up-to-date with the latest tested code.

## Automated Deployment Process

### Trigger
- **Event**: Push to `main` branch (typically from merged PR)
- **Workflow**: `.github/workflows/deploy.yml`
- **Script**: `scripts/auto-deploy-prod.sh`

### Deployment Steps

1. **Code Checkout & Build**
   - Checkout latest main branch code
   - Install dependencies with `npm install --legacy-peer-deps`
   - Build application with `npm run build`

2. **Backend Deployment**
   - Deploy to AWS Lambda using `serverless deploy --stage prod`
   - Updates production API at: `https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod`

3. **Frontend Configuration**
   - Auto-generates production config pointing to prod API
   - Ensures frontend connects to correct backend environment

4. **Frontend Deployment**
   - Sync built files to S3: `s3://aipm-static-hosting-demo`
   - Production frontend available at: `http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/`

5. **Verification & Testing**
   - API health check: Verify `/api/stories` endpoint responds
   - Frontend accessibility check
   - Parent-child story relationship validation
   - Hierarchical data structure verification

## Production URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/ |
| **API** | https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod |
| **Stories API** | https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories |

## Key Features Verified

✅ **Parent-Child Story Relationships**
- Child stories properly nested under parent stories
- API returns hierarchical structure (not flat list)
- Frontend displays correct parent-child links

✅ **Production Environment**
- Backend deployed to AWS Lambda (prod stage)
- Frontend deployed to S3 with static website hosting
- Proper CORS configuration for cross-origin requests

## Manual Deployment

If needed, you can manually trigger production deployment:

```bash
# Deploy to production
npm run deploy:prod-auto

# Or use the detailed script
./scripts/auto-deploy-prod.sh
```

## Monitoring & Verification

After each deployment, the system automatically verifies:

1. **API Health**: `curl https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories`
2. **Frontend Access**: `curl http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/`
3. **Story Structure**: Validates hierarchical parent-child relationships

## Rollback Process

If issues are detected in production:

1. **Immediate**: Revert the problematic commit in main branch
2. **Push**: The revert will trigger automatic redeployment
3. **Manual**: Use previous working deployment if needed

## Environment Variables

The production deployment uses these key configurations:

- `STAGE=prod`
- `NODE_ENV=production`
- `API_BASE=https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod`

## Success Criteria

A successful production deployment must:

- ✅ Pass all automated tests
- ✅ Deploy backend without errors
- ✅ Deploy frontend without errors
- ✅ Return HTTP 200 for API health check
- ✅ Return HTTP 200 for frontend access
- ✅ Maintain parent-child story relationships
- ✅ Serve hierarchical story data structure

## Troubleshooting

If deployment fails:

1. Check GitHub Actions logs for specific error
2. Verify AWS credentials and permissions
3. Check serverless deployment logs
4. Validate S3 bucket permissions
5. Test API endpoints manually

The automated system ensures that every PR merge to main results in a fully functional production environment with verified parent-child story relationships.
