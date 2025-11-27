# AIPM Workflow Quick Reference

## 🚀 Standard Development Cycle

### 1. Development Phase
```bash
git checkout develop
# Make your changes
git add .
git commit -m "Feature: your description"
git push origin develop
```

### 2. Deploy to Development ONLY
```bash
./deploy-develop.sh
```

### 3. Test & Verify
```bash
# Run gating tests
node run-comprehensive-gating-tests.cjs

# Manual testing at:
# http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
```

### 4. Production Deployment (After Verification)
```bash
git checkout main
git merge develop --no-ff -m "Verified: your feature"
git push origin main

# Deploy production
npx serverless deploy --stage prod
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo --delete
```

## 🌐 Environment URLs

| Environment | Frontend URL | Gating Tests |
|-------------|--------------|--------------|
| **Production** | http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com | [Tests](http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html) |
| **Development** | http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com | [Tests](http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html) |

## 🧪 Gating Test Targets

- **Production**: 10/10 tests must pass
- **Development**: 9/9 tests must pass

## ⚠️ Emergency Rollback

```bash
git checkout main
git reset --hard <last-stable-commit>
git push origin main --force
npx serverless deploy --stage prod
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo --delete
```

## 🔄 "Run in Staging" Workflow

1. **Purpose**: Sync production data to development + deploy
2. **Trigger**: Click button in PR card
3. **Result**: Development environment updated with production data
4. **Use Case**: Test features with real data

---

**Golden Rule: Development First, Production After Verification**
