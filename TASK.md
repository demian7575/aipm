# Chnage Color of Child Story in "Child Stories" list dark grey and place to bottom of the list , when the stuatus of a Child Story become 'Done'

As a User, I want to chnage color of child story in "child stories" list dark grey , when the stuatus of a child story become 'done'. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Chnage Color of Child Story in "Child Stories" list dark grey , when the stuatus of a Child Story become 'Done'
- The changes are properly tested

---
✅ Implementation Complete

## Changes Made

### 1. Frontend JS (`apps/frontend/public/app.js`)
- Added sorting logic to move 'Done' child stories to bottom of list
- Existing: Applied 'done-story' class when child status is 'Done'

### 2. Frontend CSS (`apps/frontend/public/styles.css`)
- Existing: Dark grey color (#4b5563) for `.child-story-title.done-story`

## Implementation Details

Child stories with 'Done' status now:
1. Display in dark grey color
2. Automatically move to the bottom of the Child Stories list
3. Non-Done stories remain at the top in original order