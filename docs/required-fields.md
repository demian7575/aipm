# Required Fields

## Core Requirements

### Title
- **Format**: Brief, action-oriented description
- **Validation**: Non-empty string
- **Example**: "View Project Dashboard"

### Description
- **Format**: As a [user] I want [goal] so that [value]
- **Validation**: Must follow user story template
- **Example**: "As a project manager I want to view all active stories so that I can track progress"

### Story Points
- **Format**: Non-negative integer
- **Values**: 1, 2, 3, 5, 8, 13, 21
- **Validation**: Must be from Fibonacci sequence

### Status
- **Values**: Draft | Ready | In Progress | Blocked | Approved | Done
- **Default**: Draft
- **Validation**: Must be valid status value

### Assignee
- **Format**: Valid email address
- **Validation**: Email format required
- **Example**: "developer@example.com"

### Components
- **Format**: Array of component selections
- **Validation**: At least one component required
- **Options**: System (S/S), WorkModel (WM), DocumentIntelligence (DI), Review & Governance (RG), Orchestration & Engagement (OE), Run & Verify (RV), Traceability & Insight (TI)

## Optional Fields

### Parent ID
- **Format**: UUID reference to parent story
- **Default**: null (root story)

### Acceptance Tests
- **Format**: Array of Given/When/Then test cases
- **Validation**: Required for "Ready" status
