# AIPM Deployment Instructions

## Quick Deployment Commands

### Deploy to Production
```bash
# 1. Ensure on main branch with production config
git checkout main
cp config-prod.js apps/frontend/public/config.js

# 2. Deploy to production S3
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --region us-east-1 --exclude "*.md"

# 3. Verify deployment
curl -s "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/config.js" | grep production
```

### Deploy to Development
```bash
# 1. Ensure on development branch with dev config
git checkout pr123-feature  # or current dev branch
cp apps/frontend/public/config-dev.js apps/frontend/public/config.js

# 2. Deploy to development S3
aws s3 sync apps/frontend/public/ s3://aipm-dev-frontend-hosting/ --region us-east-1 --exclude "*.md"

# 3. Verify deployment
curl -s "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/config.js" | grep development
```

## Environment Configuration

### Production Environment
- **S3 Bucket**: `aipm-static-hosting-demo`
- **URL**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Config**: `config-prod.js` (environment: 'production', DEBUG: false)
- **API**: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod

### Development Environment  
- **S3 Bucket**: `aipm-dev-frontend-hosting`
- **URL**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Config**: `config-dev.js` (environment: 'development', DEBUG: true)
- **API**: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod (shared)

## Gating Test Validation

### Run Automated Tests
```bash
# Test both environments
node run-gating-tests.cjs

# Expected output: ALL ENVIRONMENTS PASSING
```

### Manual Browser Testing
1. **Production**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
2. **Development**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html
3. Click "Run Production Tests"
4. Verify all tests pass
5. Check browser console for errors

## Feature Deployment Checklist

### Before Deployment
- [ ] Feature implemented and tested locally
- [ ] Gating tests added for new functionality
- [ ] Manual browser testing completed
- [ ] No JavaScript console errors
- [ ] Environment configs updated if needed

### Deployment Process
1. **Deploy to Development First**
   ```bash
   # Deploy and test in dev environment
   ./deploy-to-dev.sh
   # Manual browser test
   # Fix any issues
   ```

2. **Deploy to Production**
   ```bash
   # Deploy to production
   ./deploy-to-prod.sh
   # Manual browser test
   # Verify all functionality
   ```

3. **Verify Both Environments**
   ```bash
   node run-gating-tests.cjs
   # Should show: ALL ENVIRONMENTS PASSING
   ```

### Post-Deployment
- [ ] Both gating test pages working
- [ ] All features accessible in browser
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Environment detection working correctly

## Troubleshooting

### Common Issues

#### CORS Errors in Gating Tests
- **Problem**: Cross-origin requests blocked
- **Solution**: Use same-origin URLs in gating tests
- **Fix**: Update `PROD_CONFIG.frontend = window.location.origin`

#### Missing DOM Elements
- **Problem**: Gating tests can't find buttons
- **Solution**: Test HTML content instead of DOM access
- **Fix**: Use `fetch()` to check HTML content for button IDs

#### Environment Detection Issues
- **Problem**: Wrong environment detected
- **Solution**: Check hostname in config
- **Fix**: Use `window.location.hostname.includes('aipm-static-hosting-demo')`

#### JavaScript Function Not Found
- **Problem**: Functions not available when tests run
- **Solution**: Check function exists in deployed app.js
- **Fix**: Verify function deployment and naming

### Emergency Rollback
```bash
# Rollback to previous working version
git checkout <previous-working-commit>
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --region us-east-1
```

## Automation Scripts

### Available Scripts
- `run-gating-tests.cjs`: Test both environments
- `run-comprehensive-gating-tests.cjs`: Detailed testing
- `auto-save-conversation.sh`: Save development progress
- `deploy.sh`: Full deployment with gating tests

### Creating New Deployment Scripts
```bash
#!/bin/bash
# Template for deployment script
echo "Deploying to [ENVIRONMENT]..."
aws s3 sync apps/frontend/public/ s3://[BUCKET]/ --region us-east-1
echo "Testing deployment..."
node run-gating-tests.cjs
echo "Deployment complete!"
```
