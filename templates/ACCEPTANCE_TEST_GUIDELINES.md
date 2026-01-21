# Acceptance Test Guidelines (Shared)

## Purpose & Usage

**CRITICAL**: These acceptance tests will be used for:
1. **Code Generation**: Kiro CLI uses these tests to generate implementation code
2. **Automated Testing**: Tests become automated test cases in CI/CD pipeline
3. **Verification**: Tests validate that code meets acceptance criteria

**Therefore, tests MUST be**:
- **Executable**: Can be automated without manual intervention
- **Deterministic**: Same input always produces same result
- **Independent**: Can run in any order without dependencies
- **Verifiable**: Clear pass/fail criteria with observable outcomes
- **Maintainable**: Easy to understand and update

## Given-When-Then Format

### Given (Preconditions)
Initial state or context before the action.
- Example: `["User is logged in", "Dashboard is loaded"]`

### When (Actions)
User actions or system events being tested.
- Example: `["User clicks Export button", "Selects PDF format"]`

### Then (Expected Results)
Observable outcomes that verify success.
- Example: `["PDF file downloads", "File contains all data"]`

## Quality Rules

**For Automation Compatibility**:

1. **Specific**: Use concrete, testable values
   - ❌ "System responds quickly"
   - ✅ "System responds within 2 seconds"

2. **Measurable**: Include quantifiable criteria
   - ❌ "User sees results"
   - ✅ "User sees 5 search results"

3. **Observable**: Focus on verifiable behavior
   - ❌ "System processes request"
   - ✅ "System displays 'Complete' message"

4. **Automatable**: Avoid manual steps
   - ❌ "User visually inspects the layout"
   - ✅ "Page contains element with id='result'"

5. **Deterministic**: Avoid time-dependent or random outcomes
   - ❌ "System may show notification"
   - ✅ "System shows notification with text 'Success'"

## Array Format

All fields MUST be arrays of strings:
```json
{
  "given": ["precondition 1", "precondition 2"],
  "when": ["action 1", "action 2"],
  "then": ["result 1", "result 2"]
}
```

Each array must have at least one item.

## Common Patterns

**CRUD**: `given: ["User has permissions"], when: ["User fills form", "Clicks Save"], then: ["Item created", "Success shown"]`

**API**: `given: ["API available"], when: ["Send GET request"], then: ["Status 200", "Valid JSON returned"]`

**Error**: `given: ["User on form"], when: ["Enters invalid data", "Clicks Submit"], then: ["Error shown", "Form not submitted"]`

## Automation Requirements

**For CI/CD Integration**:
- Use specific element identifiers (IDs, classes, data attributes)
- Include expected HTTP status codes for API tests
- Specify exact text for messages and labels
- Define timeout values for async operations
- Avoid subjective terms (good, fast, nice)
- Include setup/teardown requirements in Given
- Ensure tests can run in isolated environments
