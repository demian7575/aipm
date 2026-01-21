# Test Story Management

## Test Parent Story

All test stories MUST be created as children of the designated test parent story:

**Test Parent ID: `1768631018504`**

This ensures:
- Test data is organized and isolated
- Easy cleanup of test stories
- No pollution of production story tree

## Usage

### Creating Test Stories

Always include `parentId` when creating test stories:

```bash
curl -X POST "$PROD_API_BASE/api/stories" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Test Story",
    "description": "Test description",
    "parentId": 1768631018504,
    "acceptWarnings": true
  }'
```

### Cleanup Test Stories

To remove all test stories:

```bash
./scripts/testing/cleanup-all-test-stories.sh
```

This will:
1. Find all stories with test-related keywords
2. Show a list for confirmation
3. Delete confirmed stories

### Verify Test Parent

Before running tests, verify the test parent exists:

```bash
./scripts/testing/create-test-root.sh
```

## Test Configuration

The test parent ID is configured in:
- `scripts/testing/test-functions.sh` - `TEST_PARENT_ID` constant
- All phase test scripts use this constant automatically

## Gating Tests

All gating test suites automatically use the test parent:
- `real-phase1-tests.sh` - Security & Data Safety
- `real-phase2-tests.sh` - Performance & API
- `real-phase3-tests.sh` - Integration
- `real-phase4-tests.sh` - Workflow
- `real-phase5-tests.sh` - End-to-End

Each test verifies the parent exists before creating test stories.
