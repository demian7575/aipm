# Product Requirements Summary

## Vision

Deliver an AI-assisted product management workspace that synchronises merge requests, user stories, and acceptance tests into an accessible outline tree and mindmap visualization. The goal is to provide INVEST and ambiguity analysis for each story, keep Git branch drift visible, and support rapid backlog refinement.

## Key Goals

- Maintain a single source of truth for merge requests, stories, and acceptance tests.
- Provide keyboard accessible tree management with drag-and-drop reordering and depth constraints.
- Offer INVEST scoring, ambiguity detection (EN/KR), and numeric-unit validation to highlight quality issues.
- Support radial mindmap visualization sharing focus with the outline view.
- Surface Git branch drift information and allow simulated refresh.

## Acceptance Criteria (Given/When/Then)

- **Story Creation**
  - **Given** the outline view is focused on a merge request, **when** a product manager adds a new story, **then** the system validates INVEST inputs and places the story within depth limits.
- **Drag & Drop**
  - **Given** a story with nested children, **when** it is dragged into a descendant, **then** the system blocks the action to prevent cycles.
- **Keyboard Navigation**
  - **Given** the tree has focus, **when** the user presses arrow keys, **then** the selection moves respecting ARIA tree semantics and Shift+Click recursively expands or collapses.
- **Mindmap Sync**
  - **Given** a story is selected in the outline, **when** the user switches to the mindmap view, **then** the same story is highlighted in the radial layout.
- **Acceptance Tests**
  - **Given** a story lacks acceptance tests, **when** the analysis runs, **then** INVEST marks the story as non-testable until Gherkin-style tests exist.
- **Ambiguity Alerts**
  - **Given** story copy includes ambiguous words (e.g., "optimal", "빠르게"), **when** saving the story, **then** ambiguity flags surface in the detail panel with remediation hints.
