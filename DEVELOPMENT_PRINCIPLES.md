# AIPM Development Principles & Workflow

## 🎯 Core Principles

### 1. Environment Separation
- **Production Environment**: Stable, tested code only
- **Development Environment**: Testing ground for new features
- **Never deploy directly to production** without proper testing cycle

### 2. Git Flow Strategy
```
develop → test → demo → verify → main → production
```

### 3. Data Integrity
- Production data synchronization to development via "Run in Staging"
- Development environment mirrors production data for realistic testing
- Separate database tables per environment

## 📋 Development Regulations

### Environment Management
1. **Production Environment**
   - **URL**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
   - **API**: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
   - **Branch**: `main` only
   - **Updates**: Only after complete development cycle
   - **Gating Tests**: Must pass 100% before any deployment

2. **Development Environment**
   - **URL**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
   - **API**: Uses production API (dev API currently broken)
   - **Branch**: `develop` branch
   - **Updates**: Continuous integration for testing
   - **Purpose**: Testing, demo, verification

### Code Quality Standards
1. **All changes must pass gating tests**
2. **No direct production deployments**
3. **Feature branches merge to develop first**
4. **Production deployments only from main branch**

## 🔄 Development Workflow

### Phase 1: Development
```bash
# Work on feature branch or develop
git checkout develop
# Make changes
git add .
git commit -m "Feature: description"
git push origin develop
```

### Phase 2: Deploy to Development
```bash
# Deploy only to development environment
./deploy-develop.sh
```

### Phase 3: Testing & Verification
1. **Run Gating Tests**
   ```bash
   node run-comprehensive-gating-tests.cjs
   ```
2. **Manual Testing** in development environment
3. **Demo** to stakeholders using development URL
4. **Verify** all functionality works as expected

### Phase 4: Production Deployment (Only After Verification)
```bash
# Merge to main only after testing
git checkout main
git merge develop --no-ff -m "Verified feature ready for production"
git push origin main

# Deploy to production
npx serverless deploy --stage prod
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo --delete
```

## 🚨 Critical Rules

### ❌ NEVER DO:
1. Deploy directly to production without testing in development
2. Skip gating tests
3. Merge untested code to main branch
4. Update production environment before development verification

### ✅ ALWAYS DO:
1. Test in development environment first
2. Run comprehensive gating tests
3. Demo changes to stakeholders
4. Verify all functionality before production deployment
5. Follow the complete workflow cycle

## 🧪 Gating Tests Requirements

### Production Environment
- **Target**: 10/10 tests must pass
- **URL**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html

### Development Environment  
- **Target**: 9/9 tests must pass
- **URL**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html

### Test Categories
1. **Environment Validation**
2. **AWS Infrastructure**
3. **Deployment Validation**
4. **Core Functionality** (including Run in Staging workflow)
5. **User Experience Validation**

## 🔧 "Run in Staging" Workflow

### Purpose
- Synchronize production data to development environment
- Test features with real production data
- Trigger development environment deployment

### Process
1. Click "Run in Staging" button in PR card
2. Backend copies production data to development tables
3. Creates commit on develop branch
4. Triggers GitHub Actions deployment to development
5. Development environment updated with latest code + production data

### Data Synchronization
- **Stories**: `aipm-backend-prod-stories` → `aipm-backend-dev-stories`
- **Tests**: `aipm-backend-prod-acceptance-tests` → `aipm-backend-dev-acceptance-tests`
- **Process**: Clear dev tables → Copy prod data → Deploy

## 📊 Environment Status Monitoring

### Health Checks
- **Production**: All systems must be green before any changes
- **Development**: Continuous monitoring during testing phase
- **Gating Tests**: Automated validation of all critical functionality

### Rollback Procedures
```bash
# If production issues occur
git checkout main
git reset --hard <last-stable-commit>
git push origin main --force

# Redeploy stable version
npx serverless deploy --stage prod
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo --delete
```

## 🎯 Success Criteria

### Development Phase Complete When:
- ✅ All gating tests pass in development
- ✅ Manual testing confirms functionality
- ✅ Stakeholder demo successful
- ✅ No critical issues identified

### Production Deployment Approved When:
- ✅ Development phase completed successfully
- ✅ All gating tests pass in both environments
- ✅ Stakeholder approval received
- ✅ Rollback plan prepared

---

**Remember: Production stability is paramount. When in doubt, test more in development.**
