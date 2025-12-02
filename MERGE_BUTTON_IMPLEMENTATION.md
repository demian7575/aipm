# Merge Button Implementation

## Overview
Implemented a "Merge" button on Development Tasks PR cards that allows PMs to merge PRs to the main branch with squash commit.

## Changes Made

### Frontend (`apps/frontend/public/app.js`)

1. **Added `mergeCodeWhispererPR()` function** (line 1679-1705)
   - Calls `/api/codewhisperer-merge` endpoint
   - Handles success/error states
   - Updates entry status and persists changes

2. **Added Merge button to PR card UI** (line 1978-1997)
   - Primary button with class `button primary merge-pr-btn`
   - Shows "Merging…" state during operation
   - Displays success/error toast notifications
   - Positioned after Rebase button, before "Test in Dev" button

### Backend (`apps/backend/app.js`)

1. **Added `handleCodeWhispererMergeRequest()` handler** (line 230-254)
   - Validates required parameters (repo, number)
   - Calls GitHub API merge endpoint
   - Uses `squash` merge method to combine all commits into one
   - Returns success/error response

2. **Added API route** (line 5585-5588)
   - Route: `POST /api/codewhisperer-merge`
   - Calls `handleCodeWhispererMergeRequest()` handler

## Technical Details

- **GitHub API**: Uses `/repos/{owner}/{repo}/pulls/{number}/merge` endpoint
- **Merge Method**: `squash` - combines all PR commits into a single commit
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **UI Feedback**: Loading states and toast notifications for user feedback

## Usage

1. Navigate to a user story with Development Tasks
2. Find a PR card in the Development Tasks section
3. Click the "Merge" button
4. The PR will be squashed and merged to the main branch
5. Success/error notification will appear

## Requirements Met

✅ Merge button on Development Tasks PR cards
✅ Squash commits into single commit
✅ Merge to GitHub main branch
✅ User feedback via toast notifications
✅ Error handling for failed merges
