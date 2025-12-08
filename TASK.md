# When click "Merge PR" button

As a User, I want to when click "merge pr" button, if the code base of the pr is not the latest. pop up  dialog box to show "the code base is outdated. click 'test in dev' again to rebase to origin/main before main".. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: When click "Merge PR" button, if the code base of the PR is not the latest. Pop up  dialog box to show "The code base is outdated. Click 'Test in Dev' again to rebase to origin/main before main".
- The changes are properly tested

---
✅ Implementation Complete

## Implementation Details:
The feature is already implemented in `apps/frontend/public/app.js` (lines 1856-1872):

1. When "Merge PR" button is clicked, it first checks if PR is up-to-date
2. Calls `checkPRUpToDate(entry)` to verify PR status
3. If `!checkResult.upToDate`, shows alert dialog with message:
   "The code base is outdated. Click 'Test in Dev' again to rebase to origin/main before main."
4. Prevents merge and returns early if outdated
5. Only proceeds with merge if PR is up-to-date

The implementation matches all acceptance criteria.