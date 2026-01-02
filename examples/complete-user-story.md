# Complete User Story Example

## Story Details

**Title**: Export Story Data

**Description**: 
As a project manager  
I want to export story data to CSV format  
So that I can share progress reports with stakeholders

**Story Points**: 5

**Status**: Ready

**Assignee**: developer@company.com

**Components**: 
- System (S/S)
- Traceability & Insight (TI)

## Acceptance Criteria

### Test 1: Successful Export
```
Given I am logged into the AIPM system
When I click the "Export CSV" button on the dashboard
Then a CSV file downloads containing all story data
```

### Test 2: Export Content Validation
```
Given I have 3 stories in the system
When I export the CSV file
Then the file contains headers: Title, Status, Assignee, Story Points, Components
```

### Test 3: Empty State Handling
```
Given there are no stories in the system
When I click the "Export CSV" button
Then I see a message "No stories to export"
```

### Test 4: Permission Validation
```
Given I am not logged into the system
When I try to access the export function
Then I am redirected to the login page
```

## INVEST Analysis

- **Independent**: ✅ Can be developed without dependencies
- **Negotiable**: ✅ Export format and fields can be discussed
- **Valuable**: ✅ Enables stakeholder reporting and communication
- **Estimable**: ✅ Standard file export functionality (5 points)
- **Small**: ✅ Fits within one sprint iteration
- **Testable**: ✅ Clear acceptance criteria with measurable outcomes

## Implementation Notes
- CSV format should include all core story fields
- Consider file naming convention with timestamp
- Handle large datasets with streaming export
- Add progress indicator for large exports
