# Merge Button Implementation

## Overview
Implemented a "Merge" button on Development Tasks PR cards that allows PMs to merge PRs to the main branch using GitHub's squash merge functionality.

## Changes Made

### Backend (apps/backend/app.js)

1. **Added `handleCodeWhispererMergeRequest` function** (line 231-255)
   - Accepts `repo` and `number` parameters
   - Calls GitHub API `/repos/{owner}/{repo}/pulls/{number}/merge`
   - Uses `merge_method: 'squash'` to squash all commits into a single commit
   - Returns success/error response

2. **Added API route** (line 5598-5601)
   - Route: `POST /api/codewhisperer-merge`
   - Calls `handleCodeWhispererMergeRequest` handler

### Frontend (apps/frontend/public/app.js)

1. **Added `mergeCodeWhispererPR` function** (line 1711-1735)
   - Sends POST request to `/api/codewhisperer-merge`
   - Handles success/error states
   - Updates entry status and persists changes

2. **Added Merge button to PR card** (line 2010-2028)
   - Button class: `button secondary codewhisperer-merge`
   - Button text: "Merge"
   - Shows "Merging…" during operation
   - Displays toast notification on success/failure
   - Positioned after Rebase button, before "Test in Dev" button

## Features

- **Squash Merge**: All commits in the PR are squashed into a single commit on merge
- **Error Handling**: Displays user-friendly error messages if merge fails
- **Loading State**: Button shows "Merging…" and is disabled during operation
- **Success Feedback**: Toast notification confirms successful merge
- **Consistent UI**: Follows existing button patterns and styling

## Usage

1. Navigate to a user story with Development Tasks
2. Find a PR card in the Development Tasks section
3. Click the "Merge" button
4. The PR will be squash-merged to the main branch
5. Success/error notification will appear

## API Endpoint

**POST** `/api/codewhisperer-merge`

**Request Body:**
```json
{
  "repo": "owner/repo-name",
  "number": 123
}
```

**Response (Success):**
```json
{
  "message": "PR merged successfully"
}
```

**Response (Error):**
```json
{
  "message": "Failed to merge PR"
}
```

## Requirements

- `GITHUB_TOKEN` environment variable must be set
- GitHub token must have write permissions to the repository
- PR must be in a mergeable state (no conflicts, checks passed, etc.)
