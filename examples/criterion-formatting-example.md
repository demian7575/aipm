# Acceptance Criterion Formatting Example

## Original vs Improved Format

### Original (Single Line)
```
Given I am logged in, When I click "New Project", Then a project creation form appears
```

### Improved (Multi-Line Format)
```
Given I am logged in to the AIPM system
When I click the "New Project" button
Then a project creation form appears with required fields
```

## Complete Story Context

**Title**: Create New Project

**Description**: 
As a project manager  
I want to create new projects  
So that I can organize stories by project scope

**Story Points**: 5

**Status**: Ready

**Assignee**: pm@company.com

**Components**: 
- System (S/S)
- Orchestration & Engagement (OE)

## Complete Acceptance Criteria

### Test 1: Form Display
```
Given I am logged in to the AIPM system
When I click the "New Project" button
Then a project creation form appears with required fields
```

### Test 2: Required Fields
```
Given the project creation form is open
When I view the form
Then I see fields for project name, description, and owner
```

### Test 3: Form Validation
```
Given I am on the project creation form
When I leave the project name empty and click "Create"
Then I see an error message "Project name is required"
```

### Test 4: Successful Creation
```
Given I have filled in all required project fields
When I click "Create Project"
Then the new project is created and I am redirected to its dashboard
```

### Test 5: Cancel Action
```
Given I am on the project creation form
When I click "Cancel"
Then the form closes and I return to the previous page
```

## Formatting Best Practices

### Multi-Line Structure
- **Given**: One line describing preconditions
- **When**: One line describing the action
- **Then**: One line describing expected outcome

### Specific Details
- ✅ "logged in to the AIPM system" (specific context)
- ✅ "New Project" button (exact UI element)
- ✅ "with required fields" (specific outcome)

### Avoid Comma Separation
- ❌ Single line with commas (hard to read)
- ✅ Multi-line format (clear structure)
- ✅ Each clause on separate line (better readability)
