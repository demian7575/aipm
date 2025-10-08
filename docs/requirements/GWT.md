# Given/When/Then Scenarios

## Story Validation
- **Given** a story payload missing INVEST prefixes
- **When** the story is saved with a blocking policy
- **Then** the API returns a validation error preventing persistence.

## Tree Manipulation
- **Given** a nested story hierarchy seeded in the backend
- **When** a story is dragged onto its ancestor
- **Then** the UI blocks the action and the backend rejects the move due to cycle protection.

## Mindmap Synchronisation
- **Given** a user expands stories in the outline view
- **When** they switch to the mindmap view
- **Then** the selected story remains highlighted, and details stay in sync.
