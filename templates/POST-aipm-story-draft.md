# User Story Generation

Generate user story with INVEST score 80+.

## Input
- featureDescription: Feature to implement
- parentId: Parent story ID (or null)
- components: Component array

## Rules for 80+ Score

**Avoid vague words**: quickly, easily, efficiently, smoothly, seamlessly, intuitively, better, improved, enhanced, optimized
**Use specifics**: "within 5 seconds", "with 3 clicks", "20 items per page"

**Title**: [Verb] + [Object] + [Context]
- ✅ "Display Story List Sorted by Priority"
- ❌ "Improve UI"

**As a**: Specific role (project manager, developer, QA engineer)
**I want**: ONE specific action with details
**So that**: Measurable benefit with numbers
**Description**: 3-4 sentences with numbers, states, UI elements
**Story Points**: 1-2 (simple), 3 (standard), 5 (complex)

## Example
```json
{
  "title": "Display User Stories in Priority-Sorted List View",
  "asA": "project manager",
  "iWant": "to view all user stories in a sortable list showing title, status, and priority level with high-priority items displayed first",
  "soThat": "I can identify critical work items within 5 seconds instead of manually searching through the entire backlog",
  "description": "Create a list view displaying user stories with three columns: title, status, and priority. Stories are sorted by priority (High, Medium, Low) with high-priority items at the top. The list shows a maximum of 20 stories per page with pagination controls.",
  "storyPoint": 3,
  "components": ["WorkModel"],
  "acceptanceTests": [{
    "title": "High priority stories appear first",
    "given": ["3 stories exist: 1 high priority, 2 low priority"],
    "when": ["User opens story list page"],
    "then": ["High priority story appears at position 1"]
  }]
}
```

## Steps

1. Extract Request ID, Parent ID, Feature description from input
2. Send progress: `curl -X POST http://localhost:8083/api/story-draft-response -H 'Content-Type: application/json' -d '{"requestId":"REQUEST_ID","status":"progress","message":"Generating story..."}'`
3. Generate story following rules above
4. Send complete: `curl -X POST http://localhost:8083/api/story-draft-response -H 'Content-Type: application/json' -d '{"requestId":"REQUEST_ID","status":"complete","title":"...","description":"...","asA":"...","iWant":"...","soThat":"...","components":["..."],"storyPoint":3,"assigneeEmail":"","parentId":PARENT_ID,"acceptWarnings":true,"acceptanceTests":[...]}'`
