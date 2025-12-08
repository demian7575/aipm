# Pull Request" modal should suport multi line text

As a User, I want to "Task title", "Objective", PR title" in "Create Pull Request" modal should suport multi line text, and can be enlarged to be auto fit to its contents. This ensures i can accomplish my goals more effectively. This work supports the parent story "Simple and Clear Apprearance".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: "Task title", "Objective", PR title" in "Create Pull Request" modal should suport multi line text, and can be enlarged to be auto fit to its contents
- The changes are properly tested

---
✅ Implementation Complete

## Changes Made:

**File:** `apps/frontend/public/app.js`

1. **Changed inputs to textareas** (lines 5164-5175):
   - Task title: `<textarea>` with `rows="1"`
   - Objective: `<textarea>` with `rows="2"`
   - PR title: `<textarea>` with `rows="1"`
   - All have `style="resize: vertical; overflow: hidden;"`

2. **Added auto-resize functionality** (lines 5241-5250):
   - Created `autoResize()` function that adjusts height to fit content
   - Applied to all three textareas on input event
   - Initial resize on load

**Result:**
- Fields now support multi-line text
- Auto-expand to fit content as user types
- Can be manually resized vertically
