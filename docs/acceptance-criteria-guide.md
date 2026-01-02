# Acceptance Criteria

## Format
```
Given [initial context/preconditions]
When [action or event occurs]
Then [expected outcome/result]
```

## Requirements
- Required for "Ready" status
- Must be verifiable and testable
- Clear pass/fail conditions
- Specific and measurable outcomes

## Structure Components

### Given (Preconditions)
- Initial state or context
- User permissions or roles
- System configuration
- Data prerequisites

### When (Action)
- User action or system event
- Trigger condition
- Input or interaction
- Process execution

### Then (Expected Result)
- Observable outcome
- System response
- Data changes
- User feedback

## Examples

### Simple Feature Test
```
Given I am logged into the AIPM system
When I click the "Create Story" button
Then a new story form opens with empty fields
```

### Data Validation Test
```
Given I am creating a new user story
When I enter story points as "abc"
Then I see an error message "Story points must be a number"
```

### Workflow Test
```
Given I have a story in "Draft" status
When I add acceptance tests and mark it "Ready"
Then the story status changes to "Ready"
```

## Best Practices
- Write from user perspective
- Be specific and measurable
- Cover happy path and edge cases
- Include error conditions
- Test one behavior per criterion

## AIPM System Integration
- Required for INVEST validation
- Used in story completion verification
- Supports automated testing
- Enforces "Done" status requirements
