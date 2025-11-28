# AIPM Deployment Quick Reference

## Complete Environment Deployment

### Deploy Development (Everything)
```bash
./deploy-dev-full.sh
```
Deploys: Lambda + API Gateway + DynamoDB + Frontend

### Deploy Production (Everything)
```bash
./deploy-prod-full.sh
```
Deploys: Lambda + API Gateway + DynamoDB + Frontend

## What Gets Deployed

| Component | Development | Production |
|-----------|-------------|------------|
| **Frontend** | aipm-dev-frontend-hosting | aipm-static-hosting-demo |
| **Lambda** | aipm-backend-dev-api | aipm-backend-prod-api |
| **API** | .../dev/api/* | .../prod/api/* |
| **Stories DB** | aipm-backend-dev-stories | aipm-backend-prod-stories |
| **Tests DB** | aipm-backend-dev-acceptance-tests | aipm-backend-prod-acceptance-tests |

## Standard Workflow

```bash
# 1. Work in develop
git checkout develop
git push origin develop

# 2. Deploy complete dev environment
./deploy-dev-full.sh

# 3. Test at:
# http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/

# 4. Promote to production
git checkout main
git merge develop
git push origin main

# 5. Deploy complete prod environment
./deploy-prod-full.sh

# 6. Verify at:
# http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
```

## Individual Component Deployment (Advanced)

### Backend Only
```bash
npx serverless deploy --stage dev   # or prod
```

### Frontend Only
```bash
# Development
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ --delete

# Production
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --delete
```

## Environment Isolation

✅ Each environment is **completely separate**
✅ Development changes **never affect** production
✅ Each has its own database tables
✅ Each has its own API endpoint

## Rollback

```bash
# Development
git checkout develop
git reset --hard <commit>
./deploy-dev-full.sh

# Production
git checkout main
git reset --hard <commit>
./deploy-prod-full.sh
```

## Remove Environment

```bash
# Remove development
npx serverless remove --stage dev

# Remove production (careful!)
npx serverless remove --stage prod
```

---

**Remember: Always deploy to development first, test, then promote to production.**
