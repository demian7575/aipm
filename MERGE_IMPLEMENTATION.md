# Merge Button Implementation

## Summary
Added a "Merge" button to Development Tasks PR cards that merges PRs to the main branch using squash merge (all commits combined into a single commit).

## Changes

### Frontend (`apps/frontend/public/app.js`)

1. **Added `mergeCodeWhispererPR()` function** (line ~1711)
   - Calls `/api/codewhisperer-merge` endpoint
   - Passes repo and PR number
   - Handles errors and updates entry state

2. **Added Merge button UI** (line ~2010)
   - Primary button styled with `button primary` class
   - Positioned after Rebase button
   - Shows "Merging…" during operation
   - Displays toast notifications for success/error

### Backend (`apps/backend/app.js`)

1. **Added `handleCodeWhispererMergeRequest()` handler** (line ~231)
   - Validates repo and number parameters
   - Calls GitHub API `/repos/{owner}/{repo}/pulls/{number}/merge`
   - Uses `merge_method: 'squash'` to combine all commits
   - Returns success/error response

2. **Added API route** (line ~5598)
   - Route: `POST /api/codewhisperer-merge`
   - Invokes merge handler

## Technical Details

- **GitHub API Endpoint**: `/repos/{owner}/{repo}/pulls/{number}/merge`
- **Merge Method**: `squash` - combines all PR commits into a single commit on main branch
- **Error Handling**: Comprehensive error handling with user feedback
- **UI Feedback**: Loading states and toast notifications

## Usage

1. Open a user story with Development Tasks
2. Locate a PR card
3. Click the "Merge" button
4. PR will be squashed and merged to main branch
5. Success/error notification appears

## Acceptance Criteria Met

✅ Merge button on Development Tasks
✅ Squashes commits into single commit
✅ Merges to GitHub main branch
✅ User feedback via notifications
