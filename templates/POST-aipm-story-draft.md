# Generate AIPM User Story Draft

## Context
You are generating a user story draft for the AI Project Manager (AIPM) system.

## Input Parameters
- `featureDescription`: Description of the feature to implement
- `parentId`: Parent story ID (number or null)
- `components`: Array of component names (default: ["WorkModel"])

## Task
Generate a complete user story following INVEST principles with acceptance tests.

## Output Format
Return a JSON object with this exact structure:

```json
{
  "title": "Brief story title",
  "description": "Detailed description",
  "asA": "User persona",
  "iWant": "User goal",
  "soThat": "User benefit",
  "components": ["WorkModel"],
  "storyPoint": 3,
  "assigneeEmail": "",
  "parentId": null,
  "acceptWarnings": true,
  "acceptanceTests": [
    {
      "title": "Test scenario title",
      "given": "Precondition",
      "when": "Action",
      "then": "Expected result",
      "status": "Draft"
    }
  ]
}
```

## Requirements
1. Story must follow INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable)
2. Generate 1-2 acceptance tests in Given-When-Then format
3. Story points should be 1-8 based on complexity
4. All acceptance tests start with status "Draft"
5. Use the provided parentId value
6. Use the provided components array

## Execution
Based on the feature description, generate the complete user story JSON and return it.
