# UI Stories by View

This document organizes UI stories into view-specific sections with module-level and unit-level focus.

## Mindmap

### Module-level stories (frontend modules)
- **Mindmap tab scaffold** — Wire the Mindmap tab container and DOM anchors in `apps/frontend/public/index.html` so the view mounts consistently and is accessible in the main tab bar.
- **Mindmap view controller** — Maintain Mindmap data loading, render triggers, and selection sync logic in `apps/frontend/public/app.js`.
- **Mindmap visual styling** — Define node, edge, selection, and layout styles in `apps/frontend/public/styles.css` to keep the canvas readable at scale.

### Unit-level stories (view behaviors)
- **Mindmap node sync** — Selecting a node updates the detail panel and outline list, and external selection updates the Mindmap focus/hover state.
- **Mindmap node positioning** — Persist manual node positions and restore them on refresh without breaking auto-layout defaults.
- **Mindmap hierarchy navigation** — Expand/collapse child branches and preserve visibility filters without losing selection.

## Kanban

### Module-level stories (frontend modules)
- **Kanban tab scaffold** — Add the Kanban column layout and drop zones in `apps/frontend/public/index.html` so columns render in the tab switcher.
- **Kanban board controller** — Build status column rendering, drag/drop wiring, and story updates in `apps/frontend/public/app.js`.
- **Kanban board styling** — Define column, card, and drag state styles in `apps/frontend/public/styles.css` to reinforce status grouping.

### Unit-level stories (view behaviors)
- **Kanban status transitions** — Dragging a card between columns updates the story status and persists changes via API.
- **Kanban status badges** — Cards reflect status, priority, and assignee metadata consistently across columns.
- **Kanban empty states** — Columns show clear empty-state messaging when no stories match the status filter.

## RTM

### Module-level stories (frontend modules)
- **RTM tab scaffold** — Add the RTM grid container, toolbar controls, and drawer host in `apps/frontend/public/index.html`.
- **RTM data/render controller** — Fetch RTM data, compute cell states, and render the matrix in `apps/frontend/public/app.js`.
- **RTM grid styling** — Style the matrix grid, frozen requirement column, and coverage state badges in `apps/frontend/public/styles.css`.

### Unit-level stories (view behaviors)
- **RTM grid filtering** — Search and “gaps only” toggles filter requirement rows without losing horizontal scroll position.
- **RTM cell drill-down** — Clicking a cell opens the evidence drawer and lists linked artifacts or a no-results state.
- **RTM coverage state badges** — Cells display GAP/COVERED/COVERED_PASS/COVERED_FAIL based on counts and latest status.
