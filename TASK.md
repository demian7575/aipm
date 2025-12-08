# Chnage Color of Child Story in "Child Stories" list dark grey , when the stuatus of a Child Story become 'Done'

As a User, I want to chnage color of child story in "child stories" list dark grey , when the stuatus of a child story become 'done'. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Chnage Color of Child Story in "Child Stories" list dark grey , when the stuatus of a Child Story become 'Done'
- The changes are properly tested

---
✅ Implementation Complete

## Changes Made

### 1. Updated `apps/frontend/public/app.js`
- Modified child story rendering logic (lines 4800-4817)
- Added conditional class `done-story` when child status is 'Done'

### 2. Updated `apps/frontend/public/styles.css`
- Added CSS rule for `.child-story-title.done-story`
- Applied dark grey color (#4b5563) to done child stories

## Implementation Details

When rendering child stories in the details panel, the code now checks if `child.status === 'Done'` and applies the `done-story` class to the title link. The CSS styling changes the text color to dark grey (#4b5563) for completed child stories, making them visually distinct from active stories.