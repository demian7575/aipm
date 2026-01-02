# User Story Generation Template

## Basic Structure
**As a** [user type]  
**I want** [functionality]  
**So that** [business value]

## Required Fields
- **Title**: Brief, descriptive name
- **Description**: Detailed story explanation
- **Acceptance Criteria**: Testable conditions
- **Story Points**: Effort estimate (non-negative integer)
- **Assignee**: Team member email
- **Components**: System areas affected
- **Status**: Draft | Ready | In Progress | Blocked | Approved | Done

## INVEST Checklist
- [ ] **Independent**: Can be developed separately
- [ ] **Negotiable**: Details can be discussed
- [ ] **Valuable**: Provides business value
- [ ] **Estimable**: Can be sized appropriately
- [ ] **Small**: Fits in one iteration
- [ ] **Testable**: Has verifiable acceptance criteria

## Acceptance Test Format
```
Given [initial context]
When [action occurs]
Then [expected outcome]
```

## Example
**Title**: User Login Authentication  
**As a** registered user  
**I want** to log in with email and password  
**So that** I can access my personal dashboard

**Acceptance Criteria**:
- Valid credentials redirect to dashboard
- Invalid credentials show error message
- Account lockout after 3 failed attempts
