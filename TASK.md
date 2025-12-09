# Add Assignee to the "Development Tasks" card. So that I can assign assignee for the task

As a User, I want to add assignee to the "development tasks" card. so that i can assign assignee for the task. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Add Assignee to the "Development Tasks" card. So that I can assign assignee for the task. The Assigner should be shown in the "Development Tasks" card.
- The changes are properly tested
- The Assignee should be Shown in the "Deveopment Tasks" card.

---
✅ Implementation Complete

## Changes Made

### 1. Frontend JS (`apps/frontend/public/app.js`)
- Added assignee display in task card rendering (after objective section)
- Added assignee input field to "Generate Code & PR" modal form
- Assignee is stored with task entry and displayed on card

### 2. Frontend CSS (`apps/frontend/public/styles.css`)
- Added `.codewhisperer-assignee` styling
- Styled assignee label with bold font weight
- Applied grey color scheme consistent with other metadata

## Implementation Details

The assignee field is now available in the Development Tasks workflow:
1. When creating a new task via "Generate Code & PR", users can enter an assignee
2. The assignee is displayed on the task card below the objective
3. Format: "Assignee: [name or email]"
4. Field is optional and can be left blank