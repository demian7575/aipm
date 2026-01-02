# User Story Input Schema

## YAML Schema

```yaml
feature_description: string (required)
parentId: string (optional)
```

## JSON Schema

```json
{
  "type": "object",
  "required": ["feature_description"],
  "properties": {
    "feature_description": {
      "type": "string"
    },
    "parentId": {
      "type": "string"
    }
  }
}
```

## Example

```yaml
feature_description: "As a project manager, I want to see all active user stories in a dashboard so that I can track project progress at a glance"
parentId: "123"
```

## Output Schema

```yaml
title: string
description: string
asA: string
iWant: string
soThat: string
components: [string]
storyPoint: number
assigneeEmail: string
parentId: number|null
acceptWarnings: boolean
```

## JSON Schema

```json
{
  "type": "object",
  "required": ["title", "description", "asA", "iWant", "soThat", "components", "storyPoint", "assigneeEmail", "acceptWarnings"],
  "properties": {
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "asA": {
      "type": "string"
    },
    "iWant": {
      "type": "string"
    },
    "soThat": {
      "type": "string"
    },
    "components": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "storyPoint": {
      "type": "number",
      "minimum": 0
    },
    "assigneeEmail": {
      "type": "string",
      "format": "email"
    },
    "parentId": {
      "type": ["number", "null"]
    },
    "acceptWarnings": {
      "type": "boolean"
    }
  }
}
```

## Output Example

```json
{
  "title": "View Project Dashboard",
  "description": "Dashboard for tracking project progress",
  "asA": "project manager",
  "iWant": "to see all active user stories in a dashboard",
  "soThat": "I can track project progress at a glance",
  "components": ["S/S"],
  "storyPoint": 5,
  "assigneeEmail": "manager@example.com",
  "parentId": null,
  "acceptWarnings": false
}
```

## Prompt Instructions

You are a user story generator for an AI Project Manager system. Given a feature description, generate a well-structured user story that follows INVEST principles.

**Instructions:**
1. **Input Processing**: Extract feature_description and optional parentId from the provided data
2. **Story Generation**: Create a user story following INVEST principles
3. **Execution**: Execute curl command to POST story to `http://localhost:3000/api/stories`
4. Create a clear, concise title (max 50 characters)
5. Break down into structured format: "As a [user], I want [functionality], so that [value]"
6. Estimate story points (1-13 Fibonacci scale) based on complexity
7. Select appropriate components from: S/S, WM, DI, RG, OE, RV, TI
8. Set acceptWarnings to false for clean stories
9. Use provided parentId if specified, otherwise null

**Output:** Valid JSON matching the output schema exactly.

## Command Template

```bash
curl -X POST http://localhost:3000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "STORY_TITLE",
    "description": "STORY_DESCRIPTION", 
    "asA": "USER_PERSONA",
    "iWant": "USER_GOAL",
    "soThat": "USER_BENEFIT",
    "components": ["WorkModel"],
    "storyPoint": STORY_POINTS,
    "assigneeEmail": "",
    "parentId": PARENT_ID_VALUE,
    "acceptWarnings": true
  }'
```

## Input Data

```yaml
feature_description: test feature
parentId: null
```
