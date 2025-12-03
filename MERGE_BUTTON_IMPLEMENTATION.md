# Merge Button Implementation

## Overview
Added a "Merge" button to Development Tasks PR cards that runs gating tests and performs a squash merge to the main branch.

## Changes Made

### Backend (apps/backend/app.js)

1. **Added mergePRToMain function** (after githubRequest function)
   - Runs comprehensive gating tests using `run-comprehensive-gating-tests.cjs`
   - Performs git squash merge of the PR branch
   - Commits changes with descriptive message
   - Pushes to main branch
   - Returns success/error status

2. **Added API endpoint** `/api/stories/:storyId/prs/:prNumber/merge` (POST)
   - Accepts storyId and prNumber as URL parameters
   - Accepts owner, repo, and branchName in request body
   - Calls mergePRToMain function
   - Returns 200 on success, 500 on error

### Frontend (apps/frontend/public/app.js)

1. **Added Merge button** in PR card actions (before Remove button)
   - Green primary button with "Merge" label
   - Shows confirmation dialog before proceeding
   - Disables button and shows "Merging..." during operation
   - Calls `/api/stories/:storyId/prs/:prNumber/merge` endpoint
   - Shows success/error toast notifications
   - Refreshes PR section after merge

### Styling (apps/frontend/public/styles.css)

1. **Added merge button styles**
   - Green background (#28a745) for primary action
   - Darker green hover state (#218838)
   - Gray disabled state (#6c757d)
   - Bold font weight for emphasis

## User Flow

1. User clicks "Merge" button on a PR card in Development Tasks
2. Confirmation dialog appears: "Run gating tests and merge this PR to main? This will squash all commits."
3. If confirmed:
   - Button shows "Merging..." and is disabled
   - Backend runs gating tests
   - If tests pass, performs squash merge to main
   - Pushes changes to GitHub
   - Shows success toast and refreshes PR list
4. If tests fail or merge fails:
   - Shows error toast with details
   - Button re-enables

## Technical Details

- **Gating Tests**: Uses existing `scripts/testing/run-comprehensive-gating-tests.cjs`
- **Merge Strategy**: Squash merge (all commits combined into one)
- **Commit Message**: `Merge PR #<number> (squashed)`
- **Error Handling**: Comprehensive error messages for test failures, merge conflicts, and push errors

## Acceptance Criteria Met

✅ "Merge" button added to Development Tasks PR cards
✅ Runs gating tests before merge
✅ Performs squash merge (single commit)
✅ Merges to main branch
✅ User feedback via confirmation dialog and toast notifications
