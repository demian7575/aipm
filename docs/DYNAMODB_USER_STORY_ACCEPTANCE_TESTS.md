# DynamoDB User Story & Acceptance Tests Tables

## Purpose
This document defines the DynamoDB data model and requirements for the **User Stories** and **Acceptance Tests** tables used by AIPM. It is aligned to the current backend implementation and is intended to be directly consumable for requirement tracking and automated test generation.

## Scope
- **User stories**: CRUD and hierarchy fields used by the UI and backend.
- **Acceptance tests**: GWT step storage linked to a story.
- **Environment resolution**: production tables via environment variables with optional dev overrides.

## Table Names & Environment Resolution
The backend resolves table names from environment variables and can optionally override with dev table names. The primary environment variables are:
- `STORIES_TABLE`
- `ACCEPTANCE_TESTS_TABLE`
- `TEST_RUNS_TABLE` (used by test runs but not required for the two tables defined here)

The dev override uses fixed names for stories and acceptance tests: `aipm-backend-dev-stories` and `aipm-backend-dev-acceptance-tests`.

## User Stories Table (`STORIES_TABLE`)
**Partition key**: `id` (Number)

### Attributes (current implementation)
| Attribute | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | Number | Yes | Assigned via `Date.now()` during creation. |
| `parentId` | Number/null | No | Used for hierarchy; nullable when root. |
| `title` | String | Yes | Empty string allowed but required by API validation. |
| `description` | String | No | Defaults to empty string. |
| `asA` | String | No | As-a intent field. |
| `iWant` | String | No | I-want intent field. |
| `soThat` | String | No | So-that intent field. |
| `components` | String | No | JSON-encoded array stored as string. |
| `storyPoint` | Number | No | Defaults to 0. |
| `assigneeEmail` | String | No | Defaults to empty string. |
| `status` | String | Yes | Defaults to `Draft` if missing. |
| `createdAt` | String (ISO) | Yes | Defaults to `new Date().toISOString()`. |
| `updatedAt` | String (ISO) | Yes | Defaults to `new Date().toISOString()`. |
| `investAnalysis` | Object/String | No | Stored as provided by AI/heuristics. |
| `mrId` | Number | No | Defaults to `1` if missing. |
| `prs` | String | No | JSON-encoded array stored as string. |

### Example Item
```json
{
  "id": 1730991123123,
  "parentId": null,
  "title": "Create story",
  "description": "Allow users to create a story with intent fields.",
  "asA": "Project user",
  "iWant": "create stories",
  "soThat": "work items are consistent",
  "components": "[\"WorkModel\"]",
  "storyPoint": 3,
  "assigneeEmail": "",
  "status": "Draft",
  "createdAt": "2024-11-08T16:12:03.123Z",
  "updatedAt": "2024-11-08T16:12:03.123Z",
  "investAnalysis": null,
  "mrId": 1,
  "prs": "[]"
}
```

## Acceptance Tests Table (`ACCEPTANCE_TESTS_TABLE`)
**Partition key**: `id` (Number)

**Global secondary index**: `storyId-index` (partition key: `storyId`)

### Attributes (current implementation)
| Attribute | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | Number | Yes | Assigned via `Date.now()` + random suffix. |
| `storyId` | Number | Yes | Foreign key to story `id`. |
| `title` | String | No | Optional label in UI. |
| `given` | String | Yes | Given step text. |
| `whenStep` | String | Yes | When step text. |
| `thenStep` | String | Yes | Then step text. |
| `status` | String | No | Draft/Pass/Fail values used by UI. |
| `createdAt` | String (ISO) | No | Set by caller if provided. |
| `updatedAt` | String (ISO) | No | Set by caller if provided. |

### Example Item
```json
{
  "id": 1730991123123999,
  "storyId": 1730991123123,
  "title": "Create story persists",
  "given": "I am in the AIPM workspace",
  "whenStep": "I submit a new story with required fields",
  "thenStep": "The story is persisted and returned",
  "status": "Draft",
  "createdAt": "2024-11-08T16:12:03.999Z",
  "updatedAt": "2024-11-08T16:12:03.999Z"
}
```

## Data Contract Notes
- Story fields are stored in **camelCase** and passed through without renaming.
- Acceptance tests are stored in **camelCase** and mapped to **snake_case** when returned by `getAllAcceptanceTests` for SQLite compatibility (`when_step`, `then_step`, `created_at`, `updated_at`).

## Requirements (Newly Generated)
Each requirement includes an automated-test-friendly GWT format.

### US-DB-001 — Create story record
**As a** backend service
**I want** to persist a story with intent fields and timestamps
**So that** the UI and API can display a stable, traceable record

**Acceptance (GWT)**
- **Given** a story payload with required fields
- **When** the story is created in DynamoDB
- **Then** the record includes `id`, `title`, `status`, `createdAt`, and `updatedAt`

### US-DB-002 — Maintain story hierarchy
**As a** product user
**I want** parent/child relationships stored in the data model
**So that** the UI can render a story tree

**Acceptance (GWT)**
- **Given** a parent story exists
- **When** a child story is created with `parentId`
- **Then** the child record stores `parentId` and remains queryable by ID

### US-DB-003 — Link acceptance tests to stories
**As a** QA/SDET
**I want** acceptance tests linked to a story via `storyId`
**So that** GWT coverage is traceable to requirements

**Acceptance (GWT)**
- **Given** a story exists
- **When** I create an acceptance test with `storyId`
- **Then** the test is stored and queryable by `storyId-index`

### US-DB-004 — Preserve GWT steps verbatim
**As a** QA/SDET
**I want** Given/When/Then steps stored exactly as authored
**So that** automated tests use the original wording

**Acceptance (GWT)**
- **Given** GWT steps contain punctuation and spacing
- **When** the acceptance test is stored
- **Then** the stored `given`, `whenStep`, and `thenStep` match the input

### US-DB-005 — Return SQLite-compatible acceptance tests
**As a** backend compatibility layer
**I want** acceptance tests returned with snake_case fields
**So that** legacy consumers can continue to function

**Acceptance (GWT)**
- **Given** acceptance tests exist in DynamoDB
- **When** I request all acceptance tests
- **Then** results include `when_step`, `then_step`, `created_at`, and `updated_at`

### US-DB-006 — Default story status
**As a** system operator
**I want** newly created stories to default to `Draft`
**So that** the workflow starts in a consistent state

**Acceptance (GWT)**
- **Given** a story payload without `status`
- **When** the story is created
- **Then** the stored record has `status = "Draft"`
