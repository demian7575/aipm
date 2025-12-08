# Create 'Done' button on User Story, when clicked make the user story to "Done" staus and reload AIPM

As a User, I want to create 'done' button on user story, when clicked make the user story to "done" staus and reload aipm. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Create 'Done' button on User Story, when clicked make the user story to "Done" staus and reload AIPM
- The changes are properly tested

---
✅ Implementation Complete

## Changes:
1. Added "Done" button to story toolbar (line 3816)
2. Added click handler that:
   - Sends PATCH to `/api/stories/:id` with `status: 'Done'`
   - Calls `loadStories()` to reload AIPM
   - Shows success/error toast notifications
