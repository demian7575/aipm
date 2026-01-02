# Improved User Story Example

## Original vs Improved Title

**Original**: "User can create new project"
**Improved**: "Create New Project"

**Why the change**:
- Removes redundant "User can" prefix
- Starts with action verb "Create"
- More concise and direct
- Follows action-oriented format

## Complete Story

**Title**: Create New Project

**Description**: 
As a project manager  
I want to create a new project workspace  
So that I can organize user stories by project scope

**Story Points**: 8

**Status**: Draft

**Assignee**: pm@company.com

**Components**: 
- System (S/S)
- Orchestration & Engagement (OE)

## Acceptance Criteria

### Test 1: Project Creation Form
```
Given I am logged into the AIPM system
When I click the "New Project" button
Then a project creation form opens with required fields
```

### Test 2: Successful Project Creation
```
Given I am on the project creation form
When I enter a valid project name and click "Create"
Then the new project appears in my project list
```

### Test 3: Validation Handling
```
Given I am creating a new project
When I leave the project name empty and click "Create"
Then I see an error message "Project name is required"
```

### Test 4: Project Workspace Access
```
Given I have created a new project
When I click on the project name
Then I am taken to the project's story workspace
```

## Title Guidelines Applied
- ✅ Starts with action verb "Create"
- ✅ Brief and descriptive
- ✅ Under 50 characters
- ✅ Present tense
- ✅ Focuses on capability, not implementation
