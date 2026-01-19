# Test Suite Documentation

## 📚 Overview

Modular test suite system that allows flexible composition of test cases for different purposes.

## 🧩 Architecture

```
test-library.sh          # Reusable test functions (building blocks)
├── Security Tests
├── Performance Tests
├── Infrastructure Tests
├── Workflow Tests
└── E2E Tests

Test Suites (compositions)
├── suite-deployment-verification.sh   # Post-deployment checks
├── suite-hourly-health.sh             # Quick health monitoring
├── suite-daily-comprehensive.sh       # Full daily validation
└── suite-weekly-full.sh               # Complete system validation
```

## 🔧 Test Library Functions

### Security Tests
- `test_api_security_headers` - Verify API security headers
- `test_database_connection` - Check database connectivity
- `test_version_endpoint` - Validate version endpoint

### Performance Tests
- `test_api_response_time` - Measure API response time
- `test_kiro_api_health` - Check Kiro API health
- `test_draft_generation_performance` - Test draft generation speed

### Infrastructure Tests
- `test_frontend_availability` - Verify frontend is accessible
- `test_s3_config` - Check S3 configuration
- `test_network_connectivity` - Test network connectivity

### Workflow Tests
- `test_story_crud` - Test story CRUD operations
- `test_invest_analysis` - Verify INVEST analysis
- `test_health_check` - Test health check endpoint
- `test_code_generation_endpoint` - Verify code generation

### E2E Tests
- `test_complete_user_journey` - Full user journey test
- `test_deployment_health` - Deployment health check
- `test_version_consistency` - Version consistency check

## 📋 Pre-built Test Suites

### 1. Deployment Verification
**Purpose**: Verify deployment succeeded
**Duration**: ~30 seconds
**Usage**:
```bash
./scripts/testing/suite-deployment-verification.sh
```
**Tests**:
- Deployment health
- Version consistency
- API security
- Database connection
- Story CRUD
- API response time
- Kiro API health
- Code generation endpoint

### 2. Hourly Health Check
**Purpose**: Quick smoke test
**Duration**: ~15 seconds
**Usage**:
```bash
./scripts/testing/suite-hourly-health.sh
```
**Tests**:
- API security headers
- Database connection
- API response time
- Frontend availability
- Kiro API health

**Cron Example**:
```bash
# Run every hour
0 * * * * cd /home/ec2-user/aipm && ./scripts/testing/suite-hourly-health.sh >> /var/log/aipm-hourly.log 2>&1
```

### 3. Daily Comprehensive
**Purpose**: Full system validation
**Duration**: ~2 minutes
**Usage**:
```bash
./scripts/testing/suite-daily-comprehensive.sh
```
**Tests**:
- All security & infrastructure tests
- All performance tests
- All workflow tests

**Cron Example**:
```bash
# Run daily at 2 AM
0 2 * * * cd /home/ec2-user/aipm && ./scripts/testing/suite-daily-comprehensive.sh >> /var/log/aipm-daily.log 2>&1
```

### 4. Weekly Full Validation
**Purpose**: Complete end-to-end validation
**Duration**: ~5 minutes
**Usage**:
```bash
./scripts/testing/suite-weekly-full.sh
```
**Tests**:
- All phases (1-5)
- Complete user journey
- Deployment verification

**Cron Example**:
```bash
# Run weekly on Sunday at 3 AM
0 3 * * 0 cd /home/ec2-user/aipm && ./scripts/testing/suite-weekly-full.sh >> /var/log/aipm-weekly.log 2>&1
```

## 🎯 Creating Custom Test Suites

### Example: Custom Suite
```bash
#!/bin/bash
# Custom test suite for specific purpose

set -e
source "$(dirname "$0")/test-library.sh"

# Configuration
API_BASE="http://your-api.com"
KIRO_API_BASE="http://your-kiro.com"

echo "🎯 Custom Test Suite"

# Pick and choose tests
test_api_security_headers "$API_BASE"
test_story_crud "$API_BASE"
test_complete_user_journey "$API_BASE"

# Summary
if [[ $PHASE_FAILED -eq 0 ]]; then
    echo "✅ Custom suite PASSED"
    exit 0
else
    echo "❌ Custom suite FAILED"
    exit 1
fi
```

## 🌍 Environment Variables

All suites support environment variables:

```bash
# Target environment
export API_BASE="http://44.220.45.57:4000"
export KIRO_API_BASE="http://44.220.45.57:8081"
export FRONTEND_URL="http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
export TARGET_ENV="prod"

# Run suite
./scripts/testing/suite-daily-comprehensive.sh
```

Or use inline:
```bash
API_BASE="http://dev-api.com" ./scripts/testing/suite-hourly-health.sh
```

## 📊 Test Results

All suites track:
- `PHASE_PASSED` - Number of passed tests
- `PHASE_FAILED` - Number of failed tests
- Exit code: 0 (success) or 1 (failure)

## 🔄 Integration Examples

### GitHub Actions
```yaml
- name: Run Deployment Verification
  run: |
    cd /home/ec2-user/aipm
    ./scripts/testing/suite-deployment-verification.sh
```

### Post-Deployment Hook
```bash
#!/bin/bash
# After deployment
./scripts/deployment/deploy-prod.sh

# Verify deployment
if ./scripts/testing/suite-deployment-verification.sh; then
    echo "✅ Deployment verified"
else
    echo "❌ Deployment verification failed - rolling back"
    ./scripts/deployment/rollback.sh
    exit 1
fi
```

### Monitoring Script
```bash
#!/bin/bash
# Continuous monitoring

while true; do
    if ! ./scripts/testing/suite-hourly-health.sh; then
        # Send alert
        curl -X POST https://alerts.example.com/webhook \
            -d '{"message":"AIPM health check failed"}'
    fi
    sleep 3600  # 1 hour
done
```

## 🎨 Customization

### Add New Test Function
Edit `test-library.sh`:
```bash
test_my_custom_check() {
    local api_base="${1:-$API_BASE}"
    log_test "My Custom Check"
    
    if curl -s "$api_base/my-endpoint" | grep -q "expected"; then
        pass_test "Custom check passed"
    else
        fail_test "Custom check failed"
    fi
}
```

### Use in Suite
```bash
source "$(dirname "$0")/test-library.sh"
test_my_custom_check "$API_BASE"
```

## 📈 Best Practices

1. **Hourly**: Quick smoke tests (< 30s)
2. **Daily**: Comprehensive validation (< 5min)
3. **Weekly**: Full E2E including user journeys
4. **Deployment**: Critical checks only
5. **Custom**: Compose for specific needs

## 🚨 Alerting

Integrate with monitoring systems:
```bash
# Example: Send to Slack on failure
if ! ./scripts/testing/suite-hourly-health.sh; then
    curl -X POST $SLACK_WEBHOOK \
        -d '{"text":"AIPM health check failed!"}'
fi
```
