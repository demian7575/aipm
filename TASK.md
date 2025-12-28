# Task: Hide User Story when the User Story is "Done" status

## User Story
As a project manager, I want to hide user stories with "Done" status from the main interface so that I can focus on active work and reduce visual clutter in the mindmap and outline views.

## Acceptance Criteria
1. Given a user story with status "Done", when viewing the mindmap, then the story node should not be visible by default
2. Given a user story with status "Done", when viewing the outline tree, then the story should not appear in the hierarchy by default  
3. Given a "Hide Completed" toggle control in the header, when clicked, then all "Done" stories should become visible/hidden accordingly
4. Given child stories under a "Done" parent, when the parent is hidden, then active child stories should remain visible to prevent losing track of ongoing work
5. Given the hide/show preference, when set by the user, then the setting should persist across browser sessions using localStorage

## Implementation Summary

### Files Modified
- `apps/frontend/public/index.html` - Added "Hide Completed" button to header
- `apps/frontend/public/app.js` - Added complete hide completed functionality

### Key Changes
1. **State Management**: Added `hideCompleted` boolean to application state
2. **UI Controls**: Added toggle button in header with proper ARIA attributes
3. **Filtering Logic**: 
   - `getVisibleStories()` - Filters outline stories based on hideCompleted state
   - `getVisibleMindmapStories()` - Updated to respect hideCompleted for mindmap rendering
4. **Persistence**: Added localStorage support for user preference
5. **Event Handling**: Toggle button updates state and re-renders views

### Technical Details
- Button uses `aria-pressed` for accessibility
- Filtering preserves active child stories even when parent is Done
- State persists across browser sessions
- Minimal code changes following existing patterns

The implementation provides a clean toggle to hide/show completed work while maintaining focus on active stories.
