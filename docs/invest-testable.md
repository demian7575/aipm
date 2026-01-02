# Testable Criterion

## Definition
**Testable**: Has clear acceptance criteria

## Key Characteristics
- Success/failure can be verified objectively
- Measurable outcomes defined
- Clear pass/fail conditions
- Observable behavior specified

## Validation Checks
- Acceptance tests use Given/When/Then format
- Criteria are specific and measurable
- Edge cases and error conditions covered
- No subjective or vague requirements

## Acceptance Test Format
```
Given [initial context/preconditions]
When [action or event occurs]
Then [expected outcome/result]
```

## Test Categories

### Functional Tests
- Feature works as specified
- User workflows complete successfully
- Data is processed correctly
- Integrations function properly

### Non-Functional Tests
- Performance meets requirements
- Security controls are effective
- Accessibility standards met
- Error handling works correctly

## Examples

### ✅ Testable Stories
```
Given I am on the dashboard page
When I click the "Export" button
Then a CSV file downloads with current story data
```

### ❌ Untestable Stories
- "Make the interface more user-friendly" (subjective)
- "Improve system performance" (no specific criteria)
- "Add better error handling" (vague requirements)

## Making Stories Testable
- Define specific, measurable outcomes
- Use concrete examples and scenarios
- Specify error conditions and edge cases
- Include performance or quality criteria

## AIPM System Impact
- Enables automated testing integration
- Supports story completion verification
- Ensures "Done" status accuracy
- Facilitates quality assurance processes
