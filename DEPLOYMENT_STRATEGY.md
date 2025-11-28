# AIPM Complete Deployment Strategy

## Overview

Each environment is **completely isolated** with its own:
- Frontend (S3 bucket)
- Backend (Lambda function)
- API Gateway
- DynamoDB tables (stories + acceptance tests)

## Environment Isolation

```
┌─────────────────────────────────────┐
│     DEVELOPMENT ENVIRONMENT         │
├─────────────────────────────────────┤
│ Branch:    develop                  │
│ Frontend:  aipm-dev-frontend-hosting│
│ Lambda:    aipm-backend-dev-api     │
│ API:       .../dev/api/*            │
│ Stories:   aipm-backend-dev-stories │
│ Tests:     aipm-backend-dev-...     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     PRODUCTION ENVIRONMENT          │
├─────────────────────────────────────┤
│ Branch:    main                     │
│ Frontend:  aipm-static-hosting-demo │
│ Lambda:    aipm-backend-prod-api    │
│ API:       .../prod/api/*           │
│ Stories:   aipm-backend-prod-stories│
│ Tests:     aipm-backend-prod-...    │
└─────────────────────────────────────┘
```

## Deployment Commands

### Development Environment (Complete)
```bash
./deploy-dev-full.sh
```

**Deploys:**
1. ✅ Backend Lambda function (stage: dev)
2. ✅ API Gateway (stage: dev)
3. ✅ DynamoDB tables (dev-stories, dev-acceptance-tests)
4. ✅ Frontend to S3 (aipm-dev-frontend-hosting)
5. ✅ Auto-configures frontend to use dev API

### Production Environment (Complete)
```bash
./deploy-prod-full.sh
```

**Deploys:**
1. ✅ Backend Lambda function (stage: prod)
2. ✅ API Gateway (stage: prod)
3. ✅ DynamoDB tables (prod-stories, prod-acceptance-tests)
4. ✅ Frontend to S3 (aipm-static-hosting-demo)
5. ✅ Auto-configures frontend to use prod API

## Deployment Flow

### Standard Development Cycle

```bash
# 1. Develop and test locally
git checkout develop
# ... make changes ...
git commit -am "Feature: description"
git push origin develop

# 2. Deploy to COMPLETE development environment
./deploy-dev-full.sh

# 3. Test in development
# Visit: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
# Run gating tests

# 4. When ready for production
git checkout main
git merge develop --no-ff -m "Release: description"
git push origin main

# 5. Deploy to COMPLETE production environment
./deploy-prod-full.sh

# 6. Verify production
# Visit: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
# Run gating tests
```

## Resource Naming Convention

All resources follow the pattern: `{service}-{stage}-{resource}`

### Development (stage: dev)
- Lambda: `aipm-backend-dev-api`
- Stories Table: `aipm-backend-dev-stories`
- Tests Table: `aipm-backend-dev-acceptance-tests`
- S3 Bucket: `aipm-dev-frontend-hosting`
- API: `https://{api-id}.execute-api.us-east-1.amazonaws.com/dev`

### Production (stage: prod)
- Lambda: `aipm-backend-prod-api`
- Stories Table: `aipm-backend-prod-stories`
- Tests Table: `aipm-backend-prod-acceptance-tests`
- S3 Bucket: `aipm-static-hosting-demo`
- API: `https://{api-id}.execute-api.us-east-1.amazonaws.com/prod`

## Configuration Management

Each deployment automatically generates the correct `config.js`:

### Development Config
```javascript
const CONFIG = {
  environment: 'development',
  apiEndpoint: 'https://{api-id}.execute-api.us-east-1.amazonaws.com/dev',
  stage: 'dev',
  region: 'us-east-1',
  storiesTable: 'aipm-backend-dev-stories',
  acceptanceTestsTable: 'aipm-backend-dev-acceptance-tests'
};
```

### Production Config
```javascript
const CONFIG = {
  environment: 'production',
  apiEndpoint: 'https://{api-id}.execute-api.us-east-1.amazonaws.com/prod',
  stage: 'prod',
  region: 'us-east-1',
  storiesTable: 'aipm-backend-prod-stories',
  acceptanceTestsTable: 'aipm-backend-prod-acceptance-tests'
};
```

## Isolation Benefits

✅ **Complete Separation**
- Development changes never affect production
- Each environment has its own data
- API endpoints are completely separate

✅ **Safe Testing**
- Test destructive operations in dev
- Experiment with new features safely
- No risk to production data

✅ **Independent Scaling**
- Each environment scales independently
- Different Lambda configurations possible
- Separate DynamoDB capacity

✅ **Clear Promotion Path**
- develop branch → dev environment
- main branch → prod environment
- Explicit promotion via git merge

## Rollback Procedures

### Development Rollback
```bash
git checkout develop
git reset --hard <commit-hash>
git push origin develop --force
./deploy-dev-full.sh
```

### Production Rollback
```bash
git checkout main
git reset --hard <commit-hash>
git push origin main --force
./deploy-prod-full.sh
```

## Cost Optimization

Both environments use:
- **Lambda**: Pay per invocation
- **DynamoDB**: Pay per request (on-demand)
- **S3**: Pay per storage + requests
- **API Gateway**: Pay per request

Development environment can be torn down when not in use:
```bash
npx serverless remove --stage dev
```

## Monitoring

### Development
- CloudWatch Logs: `/aws/lambda/aipm-backend-dev-api`
- DynamoDB Metrics: `aipm-backend-dev-*`

### Production
- CloudWatch Logs: `/aws/lambda/aipm-backend-prod-api`
- DynamoDB Metrics: `aipm-backend-prod-*`

## Security

Each environment has:
- Separate IAM roles
- Separate DynamoDB permissions
- Separate API Gateway endpoints
- CORS configured per environment

## Verification Checklist

After each deployment:

- [ ] Frontend loads without errors
- [ ] API endpoint responds
- [ ] Can create/read/update/delete stories
- [ ] Can create/read/update/delete tests
- [ ] Gating tests pass
- [ ] Correct environment shown in UI
- [ ] No cross-environment data leakage

---

**Key Principle: Each environment is a complete, isolated instance of the entire application stack.**
