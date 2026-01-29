---
inclusion: fileMatch
patterns:
  - "scripts/testing/**"
  - "tests/**"
  - ".github/workflows/**"
  - "**/*.test.js"
---

# Testing Guidelines

## Test Structure

**Phase 1**: Security & Data Safety (critical, blocks deployment)
**Phase 2**: UI & Workflow (E2E tests)

## Running Tests

```bash
# Phase 1 only (fast)
npm test

# Full gating tests
npm run test:full

# Specific environment
source scripts/utilities/load-env-config.sh production
./scripts/testing/run-structured-gating-tests.sh --env prod --phases 1
```

## Writing Tests

```bash
# ✅ DO - Use structured test format
echo "TEST: Verify API health endpoint"
RESPONSE=$(curl -s http://$API_URL/health)
if [[ "$RESPONSE" == *"healthy"* ]]; then
  echo "✅ PASS"
else
  echo "❌ FAIL: $RESPONSE"
  exit 1
fi

# ❌ DON'T - Hardcode URLs
curl -s http://44.197.204.18:4000/health
```

## Test Requirements

- **Always load config first**: `source scripts/utilities/load-env-config.sh <env>`
- **Use environment variables**: `$API_URL`, `$SEMANTIC_API_URL`, `$DYNAMODB_STORIES_TABLE`
- **Exit 1 on failure**: Tests must fail fast
- **Clear output**: Use ✅/❌ prefixes

## CI/CD Integration

- **Deploy to Prod**: Runs Phase 1 on dev first, blocks if fails
- **Deploy PR to Dev**: Runs Phase 1 on every PR
- **Gating Tests**: Must pass before merge

## Never Skip Tests

If tests fail, fix the code or the test. Never:
- Commit with `--no-verify`
- Skip CI checks
- Deploy without passing tests
