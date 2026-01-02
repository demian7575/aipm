# User Story Input Schema

## YAML Schema
```yaml
feature_description:
  type: string
  required: true
  description: "Natural language description of the feature or user story"
  
parentId:
  type: string
  required: false
  description: "ID of parent story for hierarchical organization"
```

## JSON Schema
```json
{
  "type": "object",
  "required": ["feature_description"],
  "properties": {
    "feature_description": {
      "type": "string",
      "minLength": 1
    },
    "parentId": {
      "type": ["string", "null"]
    }
  }
}
```

## API Payload Example
```yaml
feature_description: "As a project manager, I want to see all active user stories in a visual mindmap so that I can quickly assess project progress and identify bottlenecks"
parentId: null
```

```json
{
  "feature_description": "As a project manager, I want to see all active user stories in a visual mindmap so that I can quickly assess project progress and identify bottlenecks",
  "parentId": null
}
```
## Output Schema

### YAML Schema
```yaml
title:
  type: string
  required: true
  description: "Generated story title"

description:
  type: string
  required: true
  description: "Full user story in 'As a... I want... So that...' format"

storyPoints:
  type: integer
  required: true
  description: "Estimated complexity (1, 2, 3, 5, 8, 13, 21)"

assignee:
  type: string
  required: true
  description: "Email address of assigned team member"

components:
  type: array
  required: true
  description: "Relevant system components"
  items:
    - "System"
    - "WorkModel" 
    - "DocumentIntelligence"
    - "Review & Governance"
    - "Orchestration & Engagement"
    - "Run & Verify"
    - "Traceability & Insight"

acceptanceTests:
  type: array
  required: true
  description: "Generated acceptance criteria"
  items:
    description: string (Given/When/Then format)
```

### JSON Schema
```json
{
  "type": "object",
  "required": ["title", "description", "storyPoints", "assignee", "components", "acceptanceTests"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "description": {
      "type": "string",
      "minLength": 1
    },
    "storyPoints": {
      "type": "integer",
      "enum": [1, 2, 3, 5, 8, 13, 21]
    },
    "assignee": {
      "type": "string",
      "format": "email"
    },
    "components": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["System", "WorkModel", "DocumentIntelligence", "Review & Governance", "Orchestration & Engagement", "Run & Verify", "Traceability & Insight"]
      }
    },
    "acceptanceTests": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description"],
        "properties": {
          "description": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    }
  }
}
```

### Output Example
```json
{
  "title": "Project Dashboard Visualization",
  "description": "As a project manager, I want to see all active user stories in a visual mindmap so that I can quickly assess project progress and identify bottlenecks",
  "storyPoints": 5,
  "assignee": "pm@company.com",
  "components": ["System", "Orchestration & Engagement"],
  "acceptanceTests": [
    {
      "description": "Given I am logged into the AIPM workspace, When I navigate to the main dashboard, Then I should see a mindmap displaying all active stories with their current status"
    }
  ]
}
```
