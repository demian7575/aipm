# Phase 2 Test Configuration Guide

## Environment Variables

### Test Mode
```bash
export TEST_MODE="real"           # real | mock (default: real)
```

### Database Configuration
```bash
export TEST_DB_ENV="dev"          # prod | dev (default: dev)
export TEST_STORIES_TABLE="aipm-backend-dev-stories"
export TEST_ACCEPTANCE_TESTS_TABLE="aipm-backend-dev-acceptance-tests"
```

### GitHub Integration
```bash
export TEST_USE_MOCK_GITHUB="true"  # true | false (default: true)
```

### API Endpoints
```bash
export TEST_API_BASE="http://localhost:4000"
export TEST_SEMANTIC_API_BASE="http://localhost:8083"
export TEST_SSH_HOST=""  # Optional: for remote testing
```

### Kiro CLI
```bash
export USE_KIRO_MOCK="false"      # true | false (default: false)
```

## Usage Examples

### 1. Development Testing (Default)
```bash
# Uses dev DynamoDB, mock GitHub, real Semantic API
./scripts/testing/phase2-optimized.sh
```

### 2. Production Testing (Safe)
```bash
# Uses dev DynamoDB (safe), mock GitHub, real Semantic API
export TEST_DB_ENV="dev"
export TEST_USE_MOCK_GITHUB="true"
export TEST_API_BASE="http://localhost:4000"
export TEST_SSH_HOST="3.92.96.67"
./scripts/testing/phase2-optimized.sh
```

### 3. Full Production Testing (Caution!)
```bash
# Uses prod DynamoDB, real GitHub - USE WITH CAUTION
export TEST_DB_ENV="prod"
export TEST_USE_MOCK_GITHUB="false"
export TEST_STORIES_TABLE="aipm-backend-prod-stories"
export TEST_ACCEPTANCE_TESTS_TABLE="aipm-backend-prod-acceptance-tests"
export TEST_API_BASE="http://localhost:4000"
export TEST_SSH_HOST="3.92.96.67"
./scripts/testing/phase2-optimized.sh
```

### 4. Mock Everything (Fast)
```bash
# Uses dev DynamoDB, mock GitHub, mock Kiro
export TEST_DB_ENV="dev"
export TEST_USE_MOCK_GITHUB="true"
export USE_KIRO_MOCK="true"
./scripts/testing/phase2-optimized.sh
```

## Test Steps

| Step | Description | Configurable |
|------|-------------|--------------|
| 0 | Story Draft Generation (AI) | USE_KIRO_MOCK |
| 1 | Create User Story from Draft | TEST_DB_ENV |
| 2 | Acceptance Test Draft (AI) | USE_KIRO_MOCK |
| 3 | Create Acceptance Test | TEST_DB_ENV |
| 4 | GitHub Integration | TEST_USE_MOCK_GITHUB |
| 5 | Code Generation (Real) | - |
| 6 | Story Status Update | TEST_DB_ENV |
| 7 | Data Consistency | TEST_DB_ENV |
| 8 | User Story Deletion (Cascade) | TEST_DB_ENV |

## Recommended Configurations

### CI/CD Pipeline
```bash
export TEST_DB_ENV="dev"
export TEST_USE_MOCK_GITHUB="true"
export USE_KIRO_MOCK="true"
```

### Pre-Deployment Verification
```bash
export TEST_DB_ENV="dev"
export TEST_USE_MOCK_GITHUB="true"
export USE_KIRO_MOCK="false"
export TEST_SSH_HOST="3.92.96.67"
```

### Manual QA Testing
```bash
export TEST_DB_ENV="dev"
export TEST_USE_MOCK_GITHUB="false"
export USE_KIRO_MOCK="false"
```

## Safety Notes

⚠️ **Always use dev DynamoDB for testing** unless explicitly testing production data integrity.

⚠️ **Mock GitHub by default** to avoid creating unnecessary PRs.

✅ **Real Semantic API** is safe to use as it doesn't modify data.

## Cleanup

Tests automatically clean up created stories when `TEST_CLEANUP=true` (default).

To disable cleanup:
```bash
export TEST_CLEANUP="false"
./scripts/testing/phase2-optimized.sh
```
