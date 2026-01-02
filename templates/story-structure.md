# Story Structure

## Core Fields

```json
{
  "id": "unique-identifier",
  "title": "Brief descriptive name",
  "description": "As a [user] I want [goal] so that [value]",
  "storyPoints": 0,
  "assignee": "email@domain.com",
  "components": ["Frontend", "API", "Database"],
  "status": "Draft",
  "parentId": null
}
```

## Status Flow

```
Draft → Ready → In Progress → Done
  ↓       ↓         ↓
Blocked ← ← ← ← ← ← ←
  ↓
Approved
```

## Hierarchy

- **Parent Stories**: High-level features
- **Child Stories**: Specific implementations
- **Acceptance Tests**: Verification criteria per story

## Components

- System (S/S)
- WorkModel (WM) 
- DocumentIntelligence (DI)
- Review & Governance (RG)
- Orchestration & Engagement (OE)
- Run & Verify (RV)
- Traceability & Insight (TI)

## Validation Rules

- Story points: non-negative integers
- Status "Done" requires all children Done and tests Pass
- INVEST compliance checked automatically
- Assignee must be valid email format
