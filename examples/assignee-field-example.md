# Assignee Field Example

## Story Structure

**Title**: Review Story Acceptance Criteria

**Description**: 
As a project manager  
I want to review and approve story acceptance criteria  
So that I can ensure quality standards before development begins

**Story Points**: 2

**Status**: Ready

**Assignee**: pm@company.com

**Components**: 
- Review & Governance (RG)

## Assignee Analysis

### Email Format: pm@company.com
- ✅ Valid email format with @ symbol
- ✅ Clear domain structure (.com TLD)
- ✅ Professional naming convention
- ✅ Indicates role (pm = project manager)

### Role Alignment
- **Story Type**: Review and governance task
- **Assignee Role**: Project manager
- **Perfect Match**: PM responsible for quality gates

### AIPM System Integration

#### Workload Tracking
- Story points (2) counted toward pm@company.com workload
- Appears in Employee Heat Map under this assignee
- Component effort (RG) tracked for this person

#### UI Features
- **Clickable Email**: `mailto:pm@company.com` link in interface
- **Filtering**: Can filter stories by this assignee
- **Heat Map**: Shows pm@company.com's component distribution

#### Notifications
- System can send updates to pm@company.com
- Status changes notify the assignee
- Task completion alerts sent to this email

## Acceptance Criteria

### Test 1: Story Assignment
```
Given I am viewing story details
When I look at the assignee field
Then I see "pm@company.com" as a clickable email link
```

### Test 2: Workload Integration
```
Given pm@company.com is assigned this 2-point story
When I view the Employee Heat Map
Then their workload includes these 2 points in RG component
```

### Test 3: Email Validation
```
Given I am editing the assignee field
When I enter an invalid email format
Then I see an error "Please enter a valid email address"
```

## Best Practices Demonstrated
- Uses corporate domain (@company.com)
- Role-based email prefix (pm)
- Matches story responsibility to assignee expertise
- Enables proper workload distribution tracking
