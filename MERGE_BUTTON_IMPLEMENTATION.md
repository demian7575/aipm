# Merge Button Implementation

## Summary
Added a "Merge" button to Development Tasks that performs squash merge of PRs to the main branch via GitHub API.

## Changes Made

### Backend (apps/backend/app.js)

1. **Added `handleMergePRRequest` function** (after line 229)
   - Accepts `repo` and `number` parameters
   - Calls GitHub API `/repos/{owner}/{repo}/pulls/{number}/merge`
   - Uses `squash` merge method
   - Returns success/error response

2. **Registered API route** (after line 5653)
   - Route: `POST /api/merge-pr`
   - Calls `handleMergePRRequest` handler

### Frontend (apps/frontend/public/app.js)

1. **Added `mergePR` function** (after line 1708)
   - Calls backend `/api/merge-pr` endpoint
   - Handles success/error states
   - Updates entry status and persists changes

2. **Added "Merge" button** (after line 1983)
   - Button label: "Merge"
   - CSS class: `button secondary merge-pr-btn`
   - Click handler:
     - Disables button during operation
     - Shows "Merging…" text
     - Calls `mergePR(entry)` function
     - Shows success/error toast
     - Re-enables button

## Button Location
The Merge button appears in the Development Tasks section, positioned after the Rebase button and before the "Test in Dev" button.

## Functionality
- Performs squash merge (all commits squashed into single commit)
- Merges PR to main branch
- Uses GitHub API for merge operation
- Requires GITHUB_TOKEN environment variable
- Shows user feedback via toast notifications
- Follows existing button patterns (Rebase, Test in Dev)

## Testing
To test the functionality:
1. Start the server: `npm run dev`
2. Create a PR via "Generate Code & PR"
3. Click the "Merge" button on a development task
4. Verify PR is merged as a single squashed commit on GitHub
