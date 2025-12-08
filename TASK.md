# Make Font Of "title", "assignee Email", "description", "acceptance Criteria" In The "details" Panel Bold And Underline…

As a User, I want to implement Make Font of "Title", "Assignee Email", "Description", "Acceptance Criteria" in the "Details" panel bold and underline font. This ensures i can accomplish my goals more effectively. This work supports the parent story "I Will Improve AIPM Apprearance Simple And Clear".

Constraints: 

Acceptance Criteria:
- The feature works as described
- The implementation matches the requirement: Implement Make Font of "Title", "Assignee Email", "Description", "Acceptance Criteria" in the "Details" panel bold and underline font
- The changes are properly tested

---
✅ Implementation Complete

## Changes Made:

**File:** `apps/frontend/public/styles.css`

Added CSS rule to make labels in Details panel bold and underlined:

```css
.story-form .field-row > label,
.story-form .full > label {
  font-weight: bold;
  text-decoration: underline;
}
```

This targets all labels in the Details panel including:
- Title
- Assignee Email
- Description
- Acceptance Criteria (shown as "Acceptance Tests" section heading)

All specified labels now display with bold and underlined font styling.
