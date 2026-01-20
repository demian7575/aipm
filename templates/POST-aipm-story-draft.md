# Generate User Story Draft

Generate a user story following INVEST principles.

## Input
- featureDescription: Feature to implement
- parentId: Parent story ID (or null)
- components: Component array

## Output
Return ONLY this JSON (no explanations):

```json
{
  "title": "Brief title",
  "description": "Detailed description",
  "asA": "User role",
  "iWant": "User goal",
  "soThat": "User benefit",
  "components": ["WorkModel"],
  "storyPoint": 3,
  "assigneeEmail": "",
  "parentId": null,
  "acceptWarnings": true,
  "acceptanceTests": [
    {
      "title": "Test title",
      "given": "Precondition",
      "when": "Action",
      "then": "Expected result",
      "status": "Draft"
    }
  ]
}
```

Generate 1-2 acceptance tests. Story points: 1-8. Use provided parentId and components.
