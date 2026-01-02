# Given/When/Then Format

## Template Structure
```
Given [context/precondition]
When [action/trigger]
Then [expected outcome]
```

## Component Breakdown

### Given - Context/Precondition
**Purpose**: Establishes the starting state

**Examples**:
- `Given I am logged into the system`
- `Given I have a story in "Draft" status`
- `Given the database contains 5 user stories`
- `Given I am on the dashboard page`
- `Given I have admin permissions`

**Guidelines**:
- Describe initial conditions
- Set up required data or state
- Define user context or permissions
- Keep focused on relevant preconditions

### When - Action/Trigger
**Purpose**: Describes the action that triggers the behavior

**Examples**:
- `When I click the "Save" button`
- `When I enter invalid email format`
- `When I select "Export CSV" from the menu`
- `When the system processes the request`
- `When I navigate to the stories page`

**Guidelines**:
- Use active voice
- Describe specific user actions
- Include system events when relevant
- Be precise about the trigger

### Then - Expected Outcome
**Purpose**: Defines the observable result

**Examples**:
- `Then I see a success message`
- `Then the story status changes to "Ready"`
- `Then a CSV file downloads automatically`
- `Then I see an error message "Invalid email format"`
- `Then the story appears in the outline tree`

**Guidelines**:
- Describe observable behavior
- Be specific and measurable
- Include error messages when applicable
- Focus on user-visible outcomes

## Complete Examples

### Feature Test
```
Given I am viewing the story details panel
When I click the "Add Acceptance Test" button
Then a modal opens with empty Given/When/Then fields
```

### Validation Test
```
Given I am creating a new story
When I leave the title field empty and click "Save"
Then I see an error message "Title is required"
```

### Workflow Test
```
Given I have a story with all children marked "Done"
When I change the story status to "Done"
Then the status updates successfully
```
