# AIPM Conversation Context

## Latest Session: 2025-12-08

### Issues Fixed

#### 1. Done Button Implementation (PR #466)
- **Problem**: Backend required acceptance tests to mark story as "Done"
- **Fix**: Removed `missingTests` validation - stories can be Done without tests
- **Problem**: Frontend only sent `{status: "Done"}` but backend requires `title`
- **Fix**: Added `title: story.title` to PATCH request
- **Problem**: Frontend didn't send `acceptWarnings: true` to bypass INVEST validation
- **Fix**: Added `acceptWarnings: true` to allow Done despite INVEST warnings

#### 2. DynamoDB Adapter Issues
- **Problem**: `safeSelectAll` returned non-array, causing `forEach is not a function`
- **Fix**: Added `Array.isArray(result) ? result : []` check
- **Problem**: DynamoDB adapter didn't handle UPDATE statements
- **Fix**: Added UPDATE support in `prepare().run()` with `_parseUpdateParams` helper
- **Problem**: Null `storyPoint` caused DynamoDB validation error
- **Fix**: Filter out null/undefined values in `_parseUpdateParams`

#### 3. Merge PR Button Issues (PR #467)
- **Problem**: Repo parsing used `owner` and `repo` separately, but `prEntry.repo` contains `"owner/repo"`
- **Fix**: Parse with `const [owner, repo] = repoPath.split('/')`
- **Problem**: `state.stories.get()` used Map method on array
- **Fix**: Changed to `state.stories.find(s => s.id === entry.storyId)`
- **Problem**: `mergeable_state: "unknown"` treated as outdated, blocking fresh PRs
- **Fix**: Added `|| mergeableState === 'unknown'` to allow merge when GitHub is calculating
- **Problem**: Already-merged PRs showed "outdated" message
- **Fix**: Check `prData.state === 'closed' && prData.merged_at` and show "already merged" message

#### 4. AWS CLI Configuration in CI/CD
- **Problem**: Deployment config tests skipped in GitHub Actions (no AWS credentials)
- **Fix**: Added `aws-actions/configure-aws-credentials@v4` to all CI/CD jobs
- **Fix**: Removed skip logic from `test-deployment-config-gating.sh`
- **Documentation**: Created `docs/GITHUB_SECRETS_SETUP.md` with IAM setup instructions

#### 5. Development Environment Config
- **Problem**: Dev frontend pointing to prod API
- **Fix**: Deployed correct `config-dev.js` to dev S3 bucket
- **Note**: Each environment has separate config in S3, local `config.js` doesn't matter

### Gating Tests Added

Created `scripts/testing/test-merge-pr-workflow.sh` with 10 tests:
1. checkPRUpToDate function exists
2. Repo parsing splits owner/repo correctly
3. Handles unknown mergeable_state
4. Detects already-merged PRs
5. state.stories uses array methods (not Map)
6. mergePR function exists
7. Backend merge endpoint exists
8. DynamoDB UPDATE support
9. Done button sends title
10. Acceptance test not required for Done status

### Key Learnings

1. **DynamoDB vs SQLite**: DynamoDB adapter must implement all SQLite methods (prepare, get, all, run)
2. **GitHub API States**: `mergeable_state` can be "unknown" for fresh PRs - must handle gracefully
3. **Frontend State**: `state.stories` is an array, not a Map - use `.find()` not `.get()`
4. **Backend Validation**: Always include required fields (like `title`) even when only updating one field
5. **S3 Deployment**: Use `--cache-control "no-cache"` to prevent browser caching issues
6. **PR Rebasing**: Manual rebases work, but workflows may conflict - use `--strategy-option=theirs` for TASK.md

### Files Modified

**Backend:**
- `apps/backend/app.js` - Removed missingTests check, fixed safeSelectAll
- `apps/backend/dynamodb.js` - Added UPDATE support, _parseUpdateParams

**Frontend:**
- `apps/frontend/public/app.js` - Fixed Done button, Merge PR button, repo parsing, state.stories

**CI/CD:**
- `.github/workflows/ci-cd.yml` - Added AWS credentials configuration
- `docs/GITHUB_SECRETS_SETUP.md` - IAM setup guide

**Testing:**
- `scripts/testing/test-merge-pr-workflow.sh` - New gating tests
- `scripts/testing/run-all-gating-tests.sh` - Added merge PR workflow tests
- `scripts/testing/test-deployment-config-gating.sh` - Removed skip logic

### Current State

- **PR #466**: Merged to main (Done button + backend fixes)
- **PR #467**: Open, rebased on main, includes all fixes + gating tests
- **Dev Environment**: Deployed with all fixes
- **Prod Environment**: Has PR #466 fixes, needs PR #467

### Next Steps

1. Merge PR #467 to get Merge PR button fixes into main
2. Add AWS credentials to GitHub Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
3. Run full gating test suite: `./scripts/testing/run-all-gating-tests.sh`
