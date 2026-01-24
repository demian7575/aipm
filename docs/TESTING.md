# AIPM Testing Guide

## Testing Strategy

AIPM uses a multi-phase gating test approach to ensure system quality before deployment.

## Gating Tests

### Running Tests

```bash
# Load environment configuration
source scripts/utilities/load-env-config.sh production

# Run all phases
./scripts/testing/run-structured-gating-tests.sh

# Run specific phase
./scripts/testing/run-structured-gating-tests.sh --phases 1
```

### Test Phases

#### Phase 1: Critical Infrastructure (BLOCKS deployment)

**Purpose**: Verify core system health

**Tests**:
- ✅ Health check endpoint
- ✅ Database connection
- ✅ API response time
- ✅ Environment configuration
- ✅ Frontend availability
- ✅ Frontend-backend integration
- ✅ Network connectivity
- ✅ API security headers
- ✅ Semantic API health
- ✅ Version endpoint
- ✅ S3 configuration
- ✅ Code generation endpoint

**Duration**: ~30 seconds

**Failure**: Blocks deployment

#### Phase 2: E2E Workflow (BLOCKS deployment)

**Purpose**: Validate complete user journey

**Tests**:
- Story draft generation (AI)
- Story creation from draft
- Story editing
- INVEST analysis
- Acceptance test generation
- PR creation
- Code generation
- Status workflow
- Data consistency

**Duration**: ~5 minutes

**Failure**: Blocks deployment

**Note**: Requires Semantic API and Session Pool running

### GitHub Actions

Tests run automatically on push to `main`:

**Workflow**: `.github/workflows/workflow-gating-tests.yml`

**Manual Trigger**:
1. Go to Actions → "AIPM Structured Gating Tests"
2. Click "Run workflow"
3. Select environment (production/development)
4. Select phase (all, 1, 2, or 3)

### Test Configuration

Tests use centralized configuration from `config/environments.yaml`:

```yaml
production:
  ec2_ip: "44.197.204.18"
  api_port: 4000
  semantic_api_port: 8083
```

Environment variables are loaded via `scripts/utilities/load-env-config.sh`.

## Unit Tests

Run Node.js unit tests:

```bash
npm test
```

Tests are in `tests/` directory using Node's built-in test runner.

## Manual Testing

### Test Story Creation

```bash
curl -X POST http://44.197.204.18:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story",
    "asA": "developer",
    "iWant": "to test the API",
    "soThat": "I can verify it works",
    "components": ["WorkModel"],
    "storyPoint": 3
  }'
```

### Test INVEST Analysis

```bash
curl -X POST http://44.197.204.18:8083/aipm/invest-analysis?stream=true \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "test-123",
    "title": "Test Story",
    "asA": "user",
    "iWant": "feature",
    "soThat": "benefit"
  }'
```

### Test Story Draft Generation

```bash
curl -X POST http://44.197.204.18:8083/aipm/story-draft?stream=true \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "test-456",
    "featureDescription": "Add user login",
    "parentId": 1000,
    "components": ["WorkModel"]
  }'
```

## Test Data

### Sample Story

```json
{
  "title": "Display Priority-Sorted Story List",
  "asA": "project manager",
  "iWant": "to see all user stories sorted by priority",
  "soThat": "I can identify which stories need attention first",
  "description": "Display a table with title, status, and priority columns. High priority stories appear at the top.",
  "components": ["WorkModel"],
  "storyPoint": 3,
  "status": "Draft"
}
```

### Sample Acceptance Test

```json
{
  "title": "Verify story list sorting",
  "given": ["I have 5 stories with different priorities"],
  "when": ["I view the story list"],
  "then": ["High priority stories appear first", "List is sorted by priority level"],
  "status": "Draft"
}
```

## Troubleshooting Tests

### Phase 1 Failures

**Health check fails**:
```bash
# Check if backend is running
curl http://44.197.204.18:4000/health

# Check EC2 service
ssh ubuntu@44.197.204.18 'sudo systemctl status aipm-backend'
```

**Database connection fails**:
```bash
# Check DynamoDB table
aws dynamodb describe-table --table-name aipm-backend-prod-stories

# Check IAM permissions on EC2
```

### Phase 2 Failures

**Story draft generation fails**:
```bash
# Check Semantic API
curl http://44.197.204.18:8083/health

# Check Session Pool
ssh ubuntu@44.197.204.18 'sudo systemctl status kiro-session-pool'

# Check Kiro CLI authentication
ssh ubuntu@44.197.204.18 'kiro-cli --version'
```

**INVEST score too low**:
- This is expected if AI generates low-quality story
- Tests use `skipInvestValidation=true` to focus on workflow
- Production still enforces 80+ threshold

## Test Counter Bug

**Known Issue**: Test counter may show "12 tests failed" even when all tests pass (✅).

**Cause**: Counter reads from wrong source

**Impact**: None - actual test results are correct

**Workaround**: Check individual test results (✅/❌), ignore summary counter

## Related Documentation

- [Deployment](DEPLOYMENT.md) - Deployment procedures
- [Architecture](ARCHITECTURE.md) - System architecture
- [Development](DEVELOPMENT.md) - Development workflow
