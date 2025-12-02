# Done Status Grey Background Implementation

## Summary
User stories with "Done" status now display with a grey background color in both the outline view and mindmap view.

## Implementation Details

### Status Class Mapping
The `STATUS_CLASS_MAP` in `apps/frontend/public/app.js` (line 140-147) maps the "Done" status to the CSS class `status-done`:

```javascript
const STATUS_CLASS_MAP = {
  Draft: 'status-draft',
  Ready: 'status-ready',
  'In Progress': 'status-in-progress',
  Blocked: 'status-blocked',
  Approved: 'status-approved',
  Done: 'status-done',
};
```

### CSS Styling

#### Outline View
In `apps/frontend/public/styles.css` (lines 260-285), the `.outline-item.status-done` class applies:
- Background color: `#7f7f7f` (medium grey)
- Text color: `#2f2f2f` (dark grey)
- Border color: `#2f2f2f`
- Hover state: `#6f6f6f` (slightly darker grey)

#### Mindmap View
In `apps/frontend/public/styles.css` (lines 526-529), the `.mindmap-node.status-done` class applies:
- Fill color: `#7f7f7f` (medium grey)
- Stroke color: `#2f2f2f` (dark grey)
- Text colors: `#2f2f2f` for title, meta, and status

### Rendering Logic

#### Outline Rendering
The `renderOutline()` function (line 2483) applies the status class:
```javascript
const statusClass = getStatusClass(story.status);
if (statusClass) {
  row.classList.add(statusClass);
}
```

#### Mindmap Rendering
The `renderMindmap()` function (line 2983) applies the status class:
```javascript
const nodeStatusClass = getStatusClass(node.story.status);
if (nodeStatusClass) {
  group.classList.add(nodeStatusClass);
}
```

## Testing
A test suite has been created at `tests/done-status-styling.test.js` that verifies:
1. CSS includes `.outline-item.status-done` with grey background
2. CSS includes `.mindmap-node.status-done` with grey fill
3. `STATUS_CLASS_MAP` correctly maps "Done" to "status-done"

All tests pass successfully.

## User Experience
When a PM marks a user story as "Done":
1. The story immediately displays with a grey background in the outline panel
2. The story node in the mindmap also displays with a grey background
3. The grey color provides clear visual distinction from other statuses
4. Hover and selection states maintain appropriate contrast

## Acceptance Criteria
✅ User stories with "Done" status display with grey background color
✅ Styling applies to both outline and mindmap views
✅ Visual distinction is clear and consistent
✅ Tests verify the implementation
