# 🚀 AIPM Development - START HERE

**Last Updated**: 2025-11-28 10:02 JST

## 📋 Quick Start

```bash
cd /repo/ebaejun/tools/aws/aipm

# Deploy to development
./deploy-dev-full.sh

# Deploy to production (after testing)
./deploy-prod-full.sh
```

## 🎯 Core Principles

### 1. Complete Environment Isolation
- Each environment has its own: Frontend, Backend, Lambda, API Gateway, DynamoDB
- Development changes NEVER affect production
- No shared resources between environments

### 2. Development First, Production After
```
develop branch → deploy-dev-full.sh → test → verify
                                              ↓
main branch → deploy-prod-full.sh → verify → done
```

### 3. Never Skip Testing
- ❌ Never deploy directly to production
- ✅ Always test in development first
- ✅ Run gating tests before production
- ✅ Manual browser testing is mandatory

### 4. Trust User Experience Over Automation
- Automated tests can pass while browser fails (CORS, DOM, timing)
- User reports = ground truth
- Always verify in actual browser

## 🏗️ Architecture

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

## 📦 Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Node.js 18.x, Express 5.x
- **Database**: DynamoDB (stories + acceptance tests)
- **Deployment**: Serverless Framework 3.x
- **Infrastructure**: AWS Lambda, API Gateway, S3

## 🔄 Standard Development Workflow

### Step 1: Development
```bash
git checkout develop
git pull origin develop

# Make your changes
# ... edit files ...

git add .
git commit -m "Feature: description"
git push origin develop
```

### Step 2: Deploy to Development
```bash
./deploy-dev-full.sh
```

This deploys:
- ✅ Backend Lambda (dev)
- ✅ API Gateway (dev)
- ✅ DynamoDB tables (dev)
- ✅ Frontend to S3 (dev)
- ✅ Auto-configured with dev API

### Step 3: Test & Verify
```bash
# Run gating tests
node run-comprehensive-gating-tests.cjs

# Manual browser testing
# http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/

# Check gating tests page
# http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
```

**Verification Checklist:**
- [ ] Frontend loads without errors
- [ ] No console errors in browser
- [ ] Can create/edit/delete stories
- [ ] Can create/edit/delete tests
- [ ] Gating tests pass (9/9 for dev)
- [ ] All features work as expected

### Step 4: Promote to Production
```bash
git checkout main
git pull origin main
git merge develop --no-ff -m "Release: description"
git push origin main
```

### Step 5: Deploy to Production
```bash
./deploy-prod-full.sh
```

This deploys:
- ✅ Backend Lambda (prod)
- ✅ API Gateway (prod)
- ✅ DynamoDB tables (prod)
- ✅ Frontend to S3 (prod)
- ✅ Auto-configured with prod API

### Step 6: Verify Production
```bash
# Manual browser testing
# http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/

# Check gating tests page
# http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
```

**Production Checklist:**
- [ ] Frontend loads without errors
- [ ] No console errors in browser
- [ ] All features work correctly
- [ ] Gating tests pass (10/10 for prod)
- [ ] Performance acceptable

## 🚨 Critical Rules

### ❌ NEVER DO:
1. Deploy directly to production without testing in dev
2. Skip gating tests
3. Merge untested code to main branch
4. Ignore user-reported issues
5. Trust automation alone without browser testing
6. Share resources between environments

### ✅ ALWAYS DO:
1. Test in development environment first
2. Run comprehensive gating tests
3. Manual browser verification
4. Follow complete workflow cycle
5. Deploy complete environment (not partial)
6. Verify after every deployment

## 🧪 Testing Strategy

### Gating Tests
- **Development**: 9/9 tests must pass
- **Production**: 10/10 tests must pass

### Test Categories
1. Environment detection
2. AWS infrastructure validation
3. Deployment validation
4. Core functionality
5. User experience validation

### Manual Testing
- Always test in actual browser
- Check browser console for errors
- Test all CRUD operations
- Verify UI interactions
- Test with real user workflows

## 📁 Key Files & Directories

```
/repo/ebaejun/tools/aws/aipm/
├── apps/
│   ├── frontend/public/          # Frontend files
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── config.js             # Auto-generated per environment
│   │   └── production-gating-tests.html
│   └── backend/                  # Backend API
│       ├── app.js
│       ├── server.js
│       └── dynamodb.js
├── deploy-dev-full.sh            # Deploy complete dev environment
├── deploy-prod-full.sh           # Deploy complete prod environment
├── serverless.yml                # Backend infrastructure config
├── package.json                  # Dependencies
├── START_HERE.md                 # This file
├── DEPLOYMENT_STRATEGY.md        # Detailed deployment docs
├── DEVELOPMENT_PRINCIPLES.md     # Core principles
├── LESSONS_LEARNED.md            # Key insights
└── WORKFLOW_QUICK_REFERENCE.md   # Quick commands
```

## 🌐 Environment URLs

### Development
- **Frontend**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Gating Tests**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
- **API**: Auto-configured (check after deployment)

### Production
- **Frontend**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Gating Tests**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
- **API**: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod

## 🔧 Common Tasks

### View Backend Logs
```bash
# Development
npx serverless logs -f api --stage dev --tail

# Production
npx serverless logs -f api --stage prod --tail
```

### Check DynamoDB Tables
```bash
# Development
aws dynamodb scan --table-name aipm-backend-dev-stories
aws dynamodb scan --table-name aipm-backend-dev-acceptance-tests

# Production
aws dynamodb scan --table-name aipm-backend-prod-stories
aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests
```

### Rollback
```bash
# Development
git checkout develop
git reset --hard <commit-hash>
git push origin develop --force
./deploy-dev-full.sh

# Production
git checkout main
git reset --hard <commit-hash>
git push origin main --force
./deploy-prod-full.sh
```

### Remove Environment (Cleanup)
```bash
# Remove development (safe)
npx serverless remove --stage dev

# Remove production (CAREFUL!)
npx serverless remove --stage prod
```

## 🐛 Troubleshooting

### Frontend not loading
1. Check S3 bucket exists and has files
2. Verify config.js has correct API endpoint
3. Check browser console for errors
4. Verify CORS configuration

### API not responding
1. Check Lambda function deployed: `npx serverless info --stage <dev|prod>`
2. Check CloudWatch logs: `npx serverless logs -f api --stage <dev|prod>`
3. Verify DynamoDB tables exist
4. Check IAM permissions

### Gating tests failing
1. Run tests in browser (not just automated)
2. Check for CORS errors in console
3. Verify same-origin testing
4. Check API endpoint accessibility

### CORS errors
1. Verify serverless.yml CORS configuration
2. Check API Gateway CORS settings
3. Ensure frontend uses correct API endpoint
4. Test from same origin

## 📚 Additional Documentation

- **CRITICAL_PRINCIPLES.md** - **READ THIS FIRST** before any code changes
- **DEPLOYMENT_STRATEGY.md** - Complete deployment details
- **DEVELOPMENT_PRINCIPLES.md** - Core development principles
- **LESSONS_LEARNED.md** - Key insights and anti-patterns
- **WORKFLOW_QUICK_REFERENCE.md** - Quick command reference

## ⚠️ BEFORE MAKING ANY CHANGES

**MANDATORY:** Read CRITICAL_PRINCIPLES.md first!

Key rules:
1. DO NOT simplify code without understanding why it's complex
2. DO NOT modify code you don't fully understand
3. ALWAYS add comprehensive functional tests, not just HTTP 200 checks
4. ALWAYS investigate completely before changing anything

## 🧪 Running Tests

### Basic Gating Tests
```bash
node run-comprehensive-gating-tests.cjs
```

### Comprehensive Functional Tests (REQUIRED before deployment)
```bash
node comprehensive-functional-tests.js
```

This validates:
- Story hierarchy and parent-child relationships
- Data structure integrity
- No circular references
- Config correctness
- Data persistence
- **DEPLOYMENT_QUICK_REFERENCE.md** - Deployment commands

## 🎯 Success Criteria

### Development Phase Complete When:
- ✅ All gating tests pass in development
- ✅ Manual testing confirms functionality
- ✅ No critical issues identified
- ✅ Browser console clean (no errors)

### Production Deployment Approved When:
- ✅ Development phase completed successfully
- ✅ All gating tests pass in both environments
- ✅ Manual verification successful
- ✅ Rollback plan prepared

## 💡 Key Insights

1. **Automated tests ≠ Reality**: Always validate in browser
2. **Environment context matters**: Test same-origin scenarios
3. **DOM access limitations**: Test deployment artifacts, not runtime DOM
4. **User experience is truth**: When user says broken, it's broken
5. **Complete isolation**: Each environment is fully independent

## 🔄 Continuous Updates

This document is continuously updated during development. Key changes:

- **2025-11-28 10:02**: Created comprehensive starter guide
- **2025-11-28 09:57**: Added complete environment isolation strategy
- **2025-11-27**: Established development workflow and principles

---

## 🚀 Ready to Start?

```bash
# 1. Navigate to project
cd /repo/ebaejun/tools/aws/aipm

# 2. Check current branch
git branch

# 3. Deploy to development
./deploy-dev-full.sh

# 4. Start developing!
```

**Remember: Development First, Production After Verification**

---

**Questions? Check the documentation files or review LESSONS_LEARNED.md for common pitfalls.**
