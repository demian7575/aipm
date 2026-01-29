---
inclusion: fileMatch
patterns:
  - "apps/backend/**"
  - "scripts/semantic-api-server-v2.js"
  - "scripts/kiro-session-pool.js"
---

# Backend API Contracts

## REST API Endpoints

### Stories
- `GET /api/stories` → List all stories
- `GET /api/stories/:id` → Get story by ID
- `POST /api/stories` → Create story (requires INVEST validation)
- `PUT /api/stories/:id` → Update story
- `DELETE /api/stories/:id` → Delete story (cascades to children)

### Acceptance Tests
- `GET /api/acceptance-tests` → List all tests
- `GET /api/acceptance-tests?storyId=X` → Tests for story
- `POST /api/acceptance-tests` → Create test
- `PUT /api/acceptance-tests/:id` → Update test
- `DELETE /api/acceptance-tests/:id` → Delete test

### AI/Semantic API
- `POST /api/semantic/invest-analysis` → INVEST analysis
- `POST /api/semantic/story-draft` → Generate story draft
- `POST /api/semantic/acceptance-test-draft` → Generate test draft
- `POST /api/semantic/code-generation` → Generate code + PR

## Request/Response Format

```javascript
// ✅ DO - Standard response format
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operation successful"
}

// Error format
{
  "success": false,
  "error": "Error message",
  "details": { /* optional */ }
}
```

## Validation Rules

**Story Creation**:
- Must have `title`, `description`
- INVEST score ≥ 80 OR `skipInvestValidation: true`
- `storyPoints` must be non-negative integer

**Status Transitions**:
- Can't set "Done" if children not "Done"
- Can't set "Done" if acceptance tests not "Pass"

**Acceptance Tests**:
- Must have `title`, `description`, `storyId`
- Must be verifiable (automated or manual)

## DynamoDB Schema

```javascript
// Story
{
  id: "uuid",
  title: "string",
  description: "string",
  status: "Draft|Ready|In Progress|Blocked|Approved|Done",
  storyPoints: number,
  parentId: "uuid|null",
  components: ["S/S", "WM", ...],
  investAnalysis: { score: number, issues: [...] }
}

// Acceptance Test
{
  id: "uuid",
  storyId: "uuid",
  title: "string",
  description: "string",
  status: "Draft|Pass|Fail",
  verifiable: boolean
}
```

## Error Handling

```javascript
// ✅ DO
try {
  const result = await dynamodb.getStory(id);
  return { success: true, data: result };
} catch (error) {
  console.error('Failed to get story:', error);
  return { success: false, error: error.message };
}

// ❌ DON'T - Swallow errors
try {
  await dynamodb.getStory(id);
} catch (error) {
  // silent failure
}
```
