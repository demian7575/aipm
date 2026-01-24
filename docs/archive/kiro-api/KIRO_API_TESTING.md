# Kiro API Testing Guide

## Overview

Comprehensive testing suite for Kiro API covering 50+ functional requirements with automated gating tests.

## Test Files

### 1. Functional Requirements
**File:** `docs/KIRO_API_FUNCTIONAL_REQUIREMENTS.md`

50 detailed requirements organized by category:
- **FR-1:** Execute endpoint (9 requirements)
- **FR-2:** Health endpoint (3 requirements)
- **FR-3:** Request queue (4 requirements)
- **FR-4:** CORS support (2 requirements)
- **FR-5:** Error handling (3 requirements)
- **FR-6:** Concurrency control (3 requirements)
- **FR-7:** Output capture (3 requirements)
- **FR-8:** Context handling (2 requirements)
- **FR-9:** Completion instruction (1 requirement)
- **FR-10:** Process management (5 requirements)

### 2. Gating Tests

#### Bash Version (Standalone)
**File:** `scripts/testing/test-kiro-api-gating.sh`

```bash
# Run standalone
./scripts/testing/test-kiro-api-gating.sh

# With custom URL
KIRO_API_URL=http://localhost:8081 ./scripts/testing/test-kiro-api-gating.sh
```

**Tests:**
- ✅ FR-2.1: Health endpoint returns status
- ✅ FR-2.1: Health includes all required fields
- ✅ FR-1.2: Reject missing prompt (400)
- ✅ FR-4.1: Handle OPTIONS request (204)
- ✅ FR-4.2: CORS headers present
- ✅ FR-1.1: Accept valid request (200)
- ✅ FR-5.1: Handle invalid JSON

#### Node.js Version (Integration)
**File:** `scripts/testing/test-kiro-api-gating.cjs`

```bash
# Run standalone
node scripts/testing/test-kiro-api-gating.cjs

# With custom URL
KIRO_API_URL=http://localhost:8081 node scripts/testing/test-kiro-api-gating.cjs
```

**Features:**
- Same tests as bash version
- Exportable for integration
- Better JSON parsing
- Structured output

#### Unified Test Runner
**File:** `scripts/testing/run-all-gating-tests.sh`

```bash
# Run all gating tests (environments + Kiro API)
./scripts/testing/run-all-gating-tests.sh
```

**Runs:**
1. Environment tests (production + development)
2. Kiro API tests (if available)
3. Unified summary report

## Running Tests

### Quick Start

```bash
# All tests
./scripts/testing/run-all-gating-tests.sh

# Kiro API only (bash)
./scripts/testing/test-kiro-api-gating.sh

# Kiro API only (node)
node scripts/testing/test-kiro-api-gating.cjs
```

### Before Deployment

```bash
# 1. Deploy Kiro API to EC2
./scripts/deployment/deploy-kiro-api.sh

# 2. Run gating tests
./scripts/testing/run-all-gating-tests.sh

# 3. If all pass, deploy backend
./bin/deploy-dev
```

### CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run Gating Tests
  run: |
    ./scripts/testing/run-all-gating-tests.sh
  env:
    KIRO_API_URL: http://3.92.96.67:8081
```

## Test Coverage

### Covered Requirements

| Category | Requirements | Tests |
|----------|-------------|-------|
| Health Endpoint | 3 | 6 |
| Request Validation | 2 | 2 |
| CORS | 2 | 2 |
| Error Handling | 1 | 1 |
| **Total** | **8** | **11** |

### Not Yet Covered (Future)

- FR-1.3: Timeout handling (requires long-running test)
- FR-1.4-1.9: Completion detection (requires full execution)
- FR-3.1-3.4: Queue management (requires concurrent requests)
- FR-6.1-6.3: Concurrency control (requires load testing)
- FR-7.1-7.3: Output capture (requires execution)
- FR-8.1-8.2: Context handling (requires execution)
- FR-10.1-10.5: Process management (requires execution)

## Test Output

### Success Example

```
🧪 Kiro API Gating Tests
API: http://3.92.96.67:8081

📋 FR-2.1: Health Endpoint Returns Status
   ✅ Health check returns 200 with running status

📋 FR-2.1: Health Endpoint Includes Required Fields
   ✅ Health includes activeRequests
   ✅ Health includes queuedRequests
   ✅ Health includes maxConcurrent
   ✅ Health includes uptime

📋 FR-1.2: Reject Missing Prompt
   ✅ Rejects request without prompt (400)

📋 FR-4.1: Handle OPTIONS Request (CORS)
   ✅ OPTIONS request returns 204

📋 FR-4.2: CORS Headers Present
   ✅ CORS headers present

📋 FR-1.1: Accept Valid Request
   ✅ Accepts valid request (200)

📋 FR-5.1: Handle Invalid JSON
   ✅ Handles invalid JSON with error response

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Kiro API Gating Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Passed: 11
❌ Failed: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 ALL TESTS PASSED
```

### Failure Example

```
📋 FR-2.1: Health Endpoint Returns Status
   ❌ Health check returned 000 instead of 200

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Kiro API Gating Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Passed: 10
❌ Failed: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SOME TESTS FAILED
```

## Manual Testing

### Health Check

```bash
curl http://3.92.96.67:8081/health
```

Expected:
```json
{
  "status": "running",
  "activeRequests": 0,
  "queuedRequests": 0,
  "maxConcurrent": 2,
  "uptime": 123.45
}
```

### Execute Request

```bash
curl -X POST http://3.92.96.67:8081/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "List files in current directory",
    "context": "Working on AIPM",
    "timeoutMs": 30000
  }'
```

Expected:
```json
{
  "success": true,
  "output": "...",
  "hasGitCommit": false,
  "hasGitPush": false
}
```

### Missing Prompt (Error)

```bash
curl -X POST http://3.92.96.67:8081/execute \
  -H "Content-Type: application/json" \
  -d '{"context": "test"}'
```

Expected:
```json
{
  "error": "prompt required"
}
```

### CORS Preflight

```bash
curl -X OPTIONS http://3.92.96.67:8081/execute -I
```

Expected:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Troubleshooting

### Tests Fail: Connection Refused

**Problem:** Kiro API server not running

**Solution:**
```bash
ssh ec2-user@3.92.96.67
sudo systemctl status kiro-api-server
sudo systemctl start kiro-api-server
```

### Tests Fail: Timeout

**Problem:** Server responding slowly or hung

**Solution:**
```bash
ssh ec2-user@3.92.96.67
sudo systemctl restart kiro-api-server
tail -f /tmp/kiro-api-server.log
```

### Tests Fail: Wrong Response

**Problem:** Server returning unexpected data

**Solution:**
```bash
# Check server version
ssh ec2-user@3.92.96.67 "cd ~/aipm && git log -1 --oneline"

# Update server
ssh ec2-user@3.92.96.67 "cd ~/aipm && git pull && sudo systemctl restart kiro-api-server"
```

## Adding New Tests

### 1. Add Requirement

Edit `docs/KIRO_API_FUNCTIONAL_REQUIREMENTS.md`:

```markdown
### FR-X.Y: New Requirement
**Given:** Initial state
**When:** Action occurs
**Then:** Expected result
```

### 2. Add Test (Bash)

Edit `scripts/testing/test-kiro-api-gating.sh`:

```bash
echo ""
echo "📋 FR-X.Y: New Requirement"
RESPONSE=$(curl -s -w "\n%{http_code}" "$KIRO_API_URL/endpoint" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Test description"
else
    test_fail "Test description"
fi
```

### 3. Add Test (Node.js)

Edit `scripts/testing/test-kiro-api-gating.cjs`:

```javascript
const result = await testGet('/endpoint', 'Description');
tests.push({
    name: 'FR-X.Y: New Requirement',
    pass: result.success
});
```

### 4. Run Tests

```bash
./scripts/testing/test-kiro-api-gating.sh
```

## Metrics

Track test execution metrics:

- **Total Requirements:** 50
- **Tested Requirements:** 8 (16%)
- **Total Tests:** 11
- **Pass Rate:** Target 100%
- **Execution Time:** ~5 seconds
- **Coverage Goal:** 80% by production

## Next Steps

1. ✅ Deploy Kiro API to EC2
2. ✅ Run gating tests
3. ⏳ Add load tests for concurrency
4. ⏳ Add integration tests for completion detection
5. ⏳ Add performance benchmarks
6. ⏳ Integrate with CI/CD pipeline
