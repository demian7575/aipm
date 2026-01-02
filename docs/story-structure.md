# Story Structure

## Core Fields

```json
{
  "id": "unique-identifier",
  "title": "Story Title",
  "description": "As a [user] I want [goal] so that [value]",
  "storyPoints": 5,
  "status": "Ready",
  "assignee": "user@example.com",
  "components": ["System (S/S)", "WorkModel (WM)"],
  "parentId": null,
  "createdAt": "2026-01-02T04:33:55.804Z",
  "updatedAt": "2026-01-02T04:33:55.804Z"
}
```

## Status Values

- `Draft` - Being authored
- `Ready` - INVEST compliant
- `In Progress` - Active development
- `Blocked` - External dependencies
- `Approved` - Reviewed and accepted
- `Done` - Delivered and tested

## Component Options

- System (S/S)
- WorkModel (WM)
- DocumentIntelligence (DI)
- Review & Governance (RG)
- Orchestration & Engagement (OE)
- Run & Verify (RV)
- Traceability & Insight (TI)

## Hierarchy

- Stories can have `parentId` for nesting
- Parent stories cannot be `Done` until all children are `Done`
- Child stories inherit context from parents

## Validation Rules

- Story points: Non-negative integers
- Title: Required, non-empty
- Description: Must follow user story format
- Assignee: Valid email format
- Components: At least one selection required
