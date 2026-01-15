# Deployment Workflows Comparison

## Deploy to Production vs Deploy PR to Development

### Trigger Differences

**Production (`deploy-to-prod.yml`)**
```yaml
on:
  push:
    branches: [main]           # Auto-deploys on main branch push
  workflow_dispatch:           # Manual trigger
    inputs:
      force_deploy: boolean    # Can force deploy despite test failures
```

**Development (`deploy-pr-to-dev.yml`)**
```yaml
on:
  workflow_dispatch:           # Manual trigger only
    inputs:
      pr_number: string        # Requires PR number
```

### Source Code Differences

| Aspect | Production | Development |
|--------|-----------|-------------|
| **Branch** | `main` (stable) | PR branch (feature/fix) |
| **Code State** | Merged, reviewed | In-progress, testing |
| **Checkout** | Direct main checkout | Fetch PR branch by number |

### Pre-Deployment Differences

**Production**
- ✅ Runs gating tests (pre-production validation)
- ✅ Can force deploy with `force_deploy: true`
- ✅ Blocks deployment if tests fail (unless forced)
- ✅ Uses `environment: production` (GitHub protection)

**Development**
- ❌ No gating tests
- ❌ No force deploy option
- ❌ No test validation
- ✅ Uses `environment: development`

### Configuration Differences

**Production Config**
```javascript
{
  API_BASE_URL: 'http://44.220.45.57',
  ENVIRONMENT: 'production',
  stage: 'prod',
  storiesTable: 'aipm-backend-prod-stories',
  acceptanceTestsTable: 'aipm-backend-prod-acceptance-tests',
  DEBUG: false
}
```

**Development Config**
```javascript
{
  API_BASE_URL: 'http://44.222.168.46',
  ENVIRONMENT: 'development',
  stage: 'dev',
  storiesTable: 'aipm-backend-dev-stories',
  acceptanceTestsTable: 'aipm-backend-dev-acceptance-tests',
  DEBUG: true
}
```

### Infrastructure Differences

| Component | Production | Development |
|-----------|-----------|-------------|
| **EC2 Server** | 44.220.45.57 | 44.222.168.46 |
| **S3 Bucket** | aipm-static-hosting-demo | aipm-dev-frontend-hosting |
| **S3 URL** | aipm-static-hosting-demo.s3-website... | aipm-dev-frontend-hosting.s3-website... |
| **DynamoDB Stories** | aipm-backend-prod-stories | aipm-backend-dev-stories |
| **DynamoDB Tests** | aipm-backend-prod-acceptance-tests | aipm-backend-dev-acceptance-tests |

### Database Sync Differences

**Production**
- ❌ No database sync
- ✅ Production is source of truth
- ✅ Data persists across deployments

**Development**
- ✅ Syncs FROM production TO development
- ✅ Clears dev tables before import
- ✅ Mirrors production data for testing
- ⚠️ Dev data is overwritten on each deployment

### Deployment Steps Comparison

#### Common Steps (Both)
1. Checkout repository
2. Setup Node.js 18
3. Install dependencies (`npm install --legacy-peer-deps`)
4. Configure AWS credentials
5. Setup SSH key
6. Create environment config
7. Deploy backend via `deploy-to-environment.sh`
8. Deploy frontend to S3
9. Verify deployment health

#### Production-Only Steps
- Run pre-production gating tests
- Check force_deploy flag
- Block deployment on test failure

#### Development-Only Steps
- Fetch PR branch by number
- Sync database from production
- Clear dev tables
- Import production data

### Workflow Execution Flow

**Production Flow**
```
Push to main
  ↓
Run gating tests
  ↓
Tests pass? → Yes → Deploy
            → No  → Check force_deploy
                    → Yes → Deploy (with warning)
                    → No  → Block deployment
  ↓
Deploy to prod EC2 (44.220.45.57)
  ↓
Deploy to prod S3
  ↓
Verify health
```

**Development Flow**
```
Manual trigger with PR number
  ↓
Fetch PR branch
  ↓
Deploy to dev EC2 (44.222.168.46)
  ↓
Sync database (prod → dev)
  ↓
Deploy to dev S3
  ↓
Verify health
```

### Use Cases

**Production Deployment**
- Deploying stable, reviewed code
- Releasing new features to users
- Applying critical bug fixes
- Scheduled releases

**Development Deployment**
- Testing PR changes before merge
- Validating new features
- QA testing
- Stakeholder demos
- Integration testing with production data

### Safety & Protection

**Production**
- ✅ Gating tests prevent bad deployments
- ✅ GitHub environment protection rules
- ✅ Only deploys from main branch
- ✅ Requires passing tests (or explicit force)
- ⚠️ High risk - affects real users

**Development**
- ❌ No gating tests
- ✅ GitHub environment protection (optional)
- ✅ Can deploy any PR branch
- ✅ Safe to break - no user impact
- ✅ Fresh production data on each deploy

### Key Differences Summary

| Feature | Production | Development |
|---------|-----------|-------------|
| **Trigger** | Auto (main push) + Manual | Manual only |
| **Source** | main branch | PR branch |
| **Tests** | Required (gating) | None |
| **Data** | Persistent | Synced from prod |
| **Risk** | High (user-facing) | Low (testing only) |
| **Protection** | Strict | Relaxed |
| **Purpose** | Release to users | Test before merge |
| **Frequency** | On every main push | On-demand per PR |

### When to Use Each

**Use Production Deployment When:**
- Merging PR to main (automatic)
- Hotfix needs immediate release
- Scheduled release window
- All tests pass and code is reviewed

**Use Development Deployment When:**
- Testing PR changes
- Need to validate with production data
- QA needs to test before approval
- Stakeholder demo of new feature
- Integration testing required

### Cost Implications

**Production**
- Runs on every main push (frequent)
- Gating tests consume CI minutes
- Higher S3/EC2 usage (user traffic)

**Development**
- Runs only when triggered (infrequent)
- No test overhead
- Lower S3/EC2 usage (testing only)
- Database sync adds DynamoDB read/write costs
