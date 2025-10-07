# Given/When/Then Acceptance Criteria

- **Given** a product manager selects a merge request, **when** they switch between outline and mindmap views, **then** the selected merge request context and story focus persist across views.
- **Given** a user story contains vague language, **when** the detail panel loads, **then** ambiguity and measurability flags appear with quick fix guidance.
- **Given** a story tree node is shift-clicked, **when** recursive toggle is triggered, **then** all descendants expand or collapse respecting the depth limit.
- **Given** a user drags a story into one of its descendants, **when** the drop occurs, **then** the backend rejects the move preventing cycles and surfaces an error.
- **Given** a story or acceptance test is saved, **when** INVEST or measurability rules fail, **then** the API responds with structured errors describing the violation.
