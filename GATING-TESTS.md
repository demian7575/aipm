# Gating Test Management

This system automatically adds gating tests when important requirements are added or user stories are implemented.

## Automatic Test Generation

### When a User Story is Marked "Done"

The system analyzes the story and automatically adds appropriate gating tests:

```bash
# Triggered automatically when story status changes to "Done"
node hooks/post-story-implementation.js '{"title":"User Login API","description":"Implement POST /api/auth/login endpoint","status":"Done"}'
```

### Manual Test Addition

#### API Endpoint Tests
```bash
node update-gating-tests.js add-api-test StoryValidation /api/stories/validate POST '{"id":1}'
```

#### Frontend Element Tests
```bash
node update-gating-tests.js add-frontend-test GenerateButton generate-story-btn "story generation button"
```

#### Integration Workflow Tests
```bash
node update-gating-tests.js add-integration-test StoryCreationFlow "create and validate story" /api/stories POST '{"title":"test"}' /api/stories
```

## Test Categories

### Core API Tests (`core` suite)
- Endpoint availability
- Response validation
- Authentication checks

### UI Tests (`ui` suite)
- Element existence
- Button functionality
- Form validation

### Workflow Tests (`workflows` suite)
- End-to-end processes
- Multi-step operations
- Data persistence

## Integration with Development Workflow

### 1. Story Implementation
When implementing a user story:
1. Complete the implementation
2. Mark story as "Done"
3. System automatically analyzes and adds gating tests
4. Deploy with updated tests

### 2. New Feature Requirements
When adding new features:
1. Identify critical functionality
2. Add specific gating tests manually
3. Include in deployment validation

### 3. Deployment Process
The deployment script automatically:
1. Validates gating test coverage
2. Runs all gating tests
3. Prevents deployment if tests fail

## Example: Adding Story Generation Test

```bash
# Story: "As a user, I want to generate story drafts via API"
# Implementation: POST /api/stories/draft endpoint

# Automatically adds this gating test:
node update-gating-tests.js add-api-test StoryDraftGeneration /api/stories/draft POST '{"idea":"test story","parentId":null}'

# Result: New test case in production-gating-tests.js
case 'testStoryDraftGeneration':
    const storyDraftResponse = await fetch(`${PROD_CONFIG.api}/api/stories/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({"idea":"test story","parentId":null})
    });
    
    return {
        success: storyDraftResponse.ok,
        message: `Story Draft Generation: ${storyDraftResponse.status}`
    };
```

## Best Practices

1. **Add tests before deployment** - Never deploy without corresponding gating tests
2. **Test critical paths** - Focus on user-facing functionality
3. **Keep tests simple** - Each test should validate one specific requirement
4. **Update on changes** - Modify tests when requirements change
5. **Monitor failures** - Investigate and fix failing tests immediately

## Gating Test Philosophy

> "Gating tests are living requirements. They define what 'working' means in production."

- Tests should fail when the system doesn't meet requirements
- Never change tests to make them pass - fix the system instead
- Each test represents a user expectation that must be met
- Failed gating tests prevent broken deployments
