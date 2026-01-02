# Acceptance Criteria Example

## Story Context

**Title**: Update Story Status

**Description**: 
As a developer  
I want to update story status from the details panel  
So that I can track my progress on assigned work

**Story Points**: 3

**Status**: Ready

**Assignee**: dev@company.com

**Components**: 
- Orchestration & Engagement (OE)

## Acceptance Criteria

### Test 1: Status Dropdown Display
```
Given I am viewing a story in the details panel
When I look at the status field
Then I see a dropdown with all valid status options
```

### Test 2: Status Update Success
```
Given I have a story in "Ready" status
When I select "In Progress" from the status dropdown and save
Then the story status changes to "In Progress"
```

### Test 3: Status Validation
```
Given I have a story with child stories not marked "Done"
When I try to change the status to "Done"
Then I see an error "Cannot mark Done until all child stories are Done"
```

### Test 4: Status Persistence
```
Given I have updated a story status to "In Progress"
When I refresh the page and view the same story
Then the status still shows "In Progress"
```

### Test 5: Visual Feedback
```
Given I am updating a story status
When I select a new status from the dropdown
Then I see a loading indicator until the update completes
```

### Test 6: Permission Check
```
Given I am not the assigned developer for a story
When I try to update its status
Then I see a message "Only the assignee can update story status"
```

## Acceptance Criteria Best Practices Demonstrated

### Complete Coverage
- ✅ Happy path (successful update)
- ✅ Validation rules (Done status guard)
- ✅ Error handling (permission check)
- ✅ Data persistence (refresh test)
- ✅ User experience (visual feedback)

### Clear Format
- ✅ Given/When/Then structure
- ✅ Specific, measurable outcomes
- ✅ Observable behavior described
- ✅ One behavior per test

### AIPM System Integration
- ✅ Uses actual system validation rules
- ✅ Tests status workflow enforcement
- ✅ Covers assignee permission model
- ✅ Validates data persistence requirements
