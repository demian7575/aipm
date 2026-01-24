# AIPM API Endpoints

## Stories

### GET /api/stories
Get all stories with hierarchical structure and acceptance tests

### GET /api/stories/:id
Get single story by ID with acceptance tests

### POST /api/stories
Create new story
```json
{
  "title": "string",
  "description": "string",
  "asA": "string",
  "iWant": "string",
  "soThat": "string",
  "components": ["array"],
  "storyPoint": 0,
  "assignee_email": "string",
  "parentId": null,
  "status": "Draft"
}
```

### PUT /api/stories/:id
### PATCH /api/stories/:id
Update story fields

### DELETE /api/stories/:id
Delete story

### POST /api/stories/draft
Create story draft (legacy endpoint)

## Story Generation (Template-Based)

### POST /api/generate-draft
Generate user story with AI using `templates/user-story-generation.md`
```json
{
  "feature_description": "string",
  "parentId": null
}
```
**Flow:** Kiro CLI → POST /api/draft-response → creates story in DynamoDB

### POST /api/draft-response
Callback endpoint for Kiro CLI to post generated story draft

## Acceptance Tests

### POST /api/stories/:storyId/tests
Create acceptance test for story
```json
{
  "title": "string",
  "given": ["array"],
  "when": ["array"],
  "then": ["array"],
  "status": "Draft"
}
```

### POST /api/stories/:storyId/tests/draft
Generate acceptance test draft with AI using `templates/acceptance-test-generation.md`
```json
{
  "idea": "optional context string"
}
```
**Flow:** Kiro CLI → POST /api/draft-response → returns GWT steps

### DELETE /api/tests/:id
Delete acceptance test

## Health & Analysis (Template-Based)

### POST /api/stories/:storyId/health-check
Trigger INVEST analysis for story (async)

### POST /api/analyze-invest
Analyze story against INVEST criteria using `templates/invest-analysis.md`
```json
{
  "storyId": 123,
  "asA": "string",
  "iWant": "string",
  "soThat": "string"
}
```
**Flow:** Kiro CLI → POST /api/invest-response → saves to story.investAnalysis

### POST /api/invest-response
Callback endpoint for Kiro CLI to post INVEST analysis results

### POST /api/analyze-gwt
Analyze Given/When/Then structure using `templates/gwt-health-analysis.md`
```json
{
  "given": ["array"],
  "when": ["array"],
  "then": ["array"]
}
```
**Flow:** Kiro CLI → POST /api/gwt-response → returns verifiability analysis

### POST /api/gwt-response
Callback endpoint for Kiro CLI to post GWT analysis results

## Pull Requests

### POST /api/stories/:storyId/prs
Create PR for story

### POST /api/create-pr
Create PR with code generation task
```json
{
  "storyId": 123
}
```
**Flow:** Creates PR branch → adds TASK.md → queues for Kiro worker

### DELETE /api/stories/:storyId/prs/:prNumber
Delete/close PR

### POST /api/deploy-pr
Deploy PR to development environment

## Code Generation (Template-Based)

### POST /api/generate-code-branch
Generate code using `templates/code-generation.md`

### POST /api/code-generation-status
Update code generation task status

## Kiro CLI Integration

### POST /kiro/chat
Send message to Kiro CLI process

### POST /kiro/v3/transform
Transform content (v3 API)

### POST /kiro/v4/enhance
Enhance content (v4 API)

### POST /api/enhance
Enhance story with AI

### GET /api/kiro-live-log
Stream Kiro CLI live logs (SSE)

## Personal Delegation

### POST /api/personal-delegate
Delegate task to personal AI assistant

### GET /api/personal-delegate/status/:taskId
Get delegation task status

## System

### GET /api/version
Get API version info

### GET /api/runtime-data
Get runtime configuration

### GET /api/templates
List available templates

### POST /api/update-task-spec
Update task specification

## Template-Based Endpoints Summary

| Endpoint | Template | Purpose |
|----------|----------|---------|
| POST /api/generate-draft | user-story-generation.md | Create user story with AI |
| POST /api/stories/:id/tests/draft | acceptance-test-generation.md | Generate GWT test steps |
| POST /api/analyze-invest | invest-analysis.md | Validate INVEST criteria |
| POST /api/analyze-gwt | gwt-health-analysis.md | Validate GWT structure |
| POST /api/create-pr | code-generation.md | Generate implementation code |

## Callback Endpoints (Kiro CLI → Backend)

- POST /api/draft-response - Story/test draft results
- POST /api/invest-response - INVEST analysis results
- POST /api/gwt-response - GWT analysis results

## Response Codes

- 200 - Success
- 400 - Bad request (invalid parameters)
- 404 - Not found
- 500 - Server error
- 501 - Not implemented (endpoint missing)

## Notes

- All endpoints return JSON
- CORS enabled for all origins
- Template-based endpoints use async callback pattern
- Kiro CLI runs as persistent child process
- Global state used for IPC: `global.latestDraft`, `global.latestInvestResult`
