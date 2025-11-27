# AIPM Deployment Gating Tests

Comprehensive tests to validate that all deployment components are working correctly.

## Test Coverage

### 🌐 Frontend Tests
- ✅ S3 static website accessibility
- ✅ HTML, CSS, JS asset availability
- ✅ Configuration file correctness
- ✅ Load performance (< 3s dev, < 2s prod)

### ⚡ Backend Tests
- ✅ Lambda function responsiveness
- ✅ API Gateway endpoint availability
- ✅ CORS configuration
- ✅ Response performance (< 5s dev, < 3s prod)

### 🗄️ Storage Tests
- ✅ DynamoDB table accessibility
- ✅ Read operations (GET /api/stories)
- ✅ Write operations (POST /api/stories)
- ✅ Delete operations (DELETE /api/stories/:id)

### 🔒 Environment Isolation
- ✅ Separate API endpoints per stage
- ✅ Separate frontend URLs per stage
- ✅ Independent data storage
- ✅ No cross-environment data leakage

## Running Tests

### Quick Commands

```bash
# Test all environments
npm run gating:all

# Test development only
npm run gating:dev

# Test production only
npm run gating:prod

# Run specific test file
npm run test:deployment-gating
```

### Manual Script Execution

```bash
# All environments with isolation tests
./scripts/run-gating-tests.sh all

# Development environment only
./scripts/run-gating-tests.sh dev

# Production environment only
./scripts/run-gating-tests.sh prod
```

## Automatic Testing

Gating tests run automatically after deployment:

```bash
# Deploy with automatic gating tests
./deploy-multi-stage.sh dev    # Runs dev gating tests
./deploy-multi-stage.sh prod   # Runs prod gating tests
./deploy-multi-stage.sh all    # Runs comprehensive tests
```

## Test Environments

### Development
- **API**: `https://0v2m13m6h8.execute-api.us-east-1.amazonaws.com/dev`
- **Frontend**: `http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com`
- **DynamoDB**: `aipm-backend-dev-*` tables

### Production
- **API**: `https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod`
- **Frontend**: `http://aipm-prod-frontend-hosting.s3-website-us-east-1.amazonaws.com`
- **DynamoDB**: `aipm-backend-prod-*` tables

## Test Categories

### 1. Deployment Completeness
- All required endpoints exist
- All frontend assets are deployed
- Configuration files are correct

### 2. Functional Validation
- API endpoints return expected responses
- Database operations work correctly
- CORS is properly configured

### 3. Performance Gates
- API response times meet thresholds
- Frontend load times are acceptable
- Lambda cold starts are handled

### 4. Environment Isolation
- Dev and prod are completely separate
- No data cross-contamination
- Independent configurations

## Troubleshooting

### Common Issues

**API Not Accessible**
- Check Lambda function deployment
- Verify API Gateway configuration
- Ensure IAM permissions are correct

**Frontend Not Loading**
- Verify S3 bucket exists and is public
- Check static website hosting configuration
- Ensure all assets were uploaded

**DynamoDB Errors**
- Confirm tables exist in correct region
- Check Lambda IAM role has DynamoDB permissions
- Verify table names match environment

**CORS Issues**
- Check API Gateway CORS settings
- Verify Lambda function returns CORS headers
- Ensure frontend origin is allowed

### Test Failures

If gating tests fail:

1. **Check deployment logs** for errors
2. **Verify AWS resources** exist in console
3. **Run individual tests** to isolate issues
4. **Check network connectivity** to endpoints

## CI/CD Integration

Gating tests are integrated into the deployment pipeline and will fail the deployment if any component is not working correctly.

The tests ensure:
- ✅ All components are deployed
- ✅ All components are accessible
- ✅ All components are performing within thresholds
- ✅ Environments are properly isolated
