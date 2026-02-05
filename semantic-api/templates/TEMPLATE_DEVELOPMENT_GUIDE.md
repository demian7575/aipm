# Semantic API Template Development Guide

**FOR DEVELOPERS**: This guide explains how to create and modify Semantic API templates.

## Template Structure

All Semantic API templates follow this structure:

```markdown
# [Template Name]

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md` (Common sections below)

---

**YOU ARE**: [Specific Role]
**YOUR AUTHORITY**: [Specific task authority]
**EXECUTION ACTION**: [Specific action]

---

## Input
[Input parameters]

## Technical Specifications
[Output schema and curl command]

## EXECUTION INSTRUCTIONS
[Step-by-step execution guide]
```

## Common Sections (in SEMANTIC_API_GUIDELINES.md)

The following sections are shared across all templates:
- ROLE ASSIGNMENT (structure)
- AUTHORITY & RESPONSIBILITY (full text)
- COMPLIANCE REQUIREMENTS (full text)
- EXECUTION COMMAND (structure)
- Standard Execution Pattern (4 steps)

## Template-Specific Sections

Each template must define:

### 1. Role Definition
```markdown
**YOU ARE**: A User Story Writer
**YOUR AUTHORITY**: Generate user stories following provided specifications
**EXECUTION ACTION**: Generate user story and execute curl POST immediately
```

### 2. Input Parameters
```markdown
## Input
- featureDescription: Feature to implement
- parentId: Parent story ID (or null)
- components: Component array
```

### 3. Output Schema
```json
{
  "title": "string",
  "description": "string",
  "field": "type"
}
```

### 4. Curl Command
```bash
curl -X POST http://localhost:8083/api/[endpoint]-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "field1": "VALUE1"
  }'
```

### 5. Execution Instructions
```markdown
**STEP 1**: Extract values from the prompt:
  - Find "Request ID: XXXXX" and extract the UUID
  - [Other extractions]

**STEP 2**: [Generate/Process content]

**STEP 3**: Replace ALL placeholders:
  - REQUEST_ID_VALUE → the UUID from "Request ID:" line
  - [Other replacements]

**STEP 4**: Execute the curl command using bash tool

**CRITICAL**: 
- The requestId MUST be the exact UUID from the "Request ID:" line
- [Other critical requirements]
```

## Naming Conventions

### Placeholder Naming
Use `UPPERCASE_WITH_UNDERSCORES`:
- `REQUEST_ID_VALUE`
- `STORY_TITLE`
- `TEST_GIVEN`
- `PARENT_ID_VALUE`

### Endpoint Pattern
Follow `/api/[name]-response`:
- `/api/story-draft-response`
- `/api/acceptance-test-draft-response`
- `/api/invest-analysis-response`
- `/api/gwt-analysis-response`
- `/api/code-generation-response`

## Creating New Templates

### Step 1: Copy Existing Template
```bash
cp POST-aipm-story-draft.md POST-aipm-new-feature.md
```

### Step 2: Update Header
```markdown
# New Feature Template

**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`

---

**YOU ARE**: A [New Role]
**YOUR AUTHORITY**: [New task authority]
**EXECUTION ACTION**: [New action]
```

### Step 3: Define Input
```markdown
## Input
- parameter1: Description
- parameter2: Description
```

### Step 4: Define Output Schema
```json
{
  "field1": "type",
  "field2": "type"
}
```

### Step 5: Write Curl Command
```bash
curl -X POST http://localhost:8083/api/new-feature-response \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "REQUEST_ID_VALUE",
    "field1": "VALUE1"
  }'
```

### Step 6: Write Execution Instructions
Follow the 4-step pattern with specific details.

### Step 7: Add to Semantic API Server
Update `scripts/semantic-api-server-v2.js` to handle the new endpoint.

## Modifying Existing Templates

### What You Can Modify
- ✅ Role name
- ✅ Authority description
- ✅ Execution action
- ✅ Input parameters
- ✅ Output schema
- ✅ Curl command fields
- ✅ Step 2 details (generation logic)
- ✅ Placeholder replacements

### What You Cannot Modify
- ❌ AUTHORITY & RESPONSIBILITY text (in SEMANTIC_API_GUIDELINES.md)
- ❌ COMPLIANCE REQUIREMENTS text (in SEMANTIC_API_GUIDELINES.md)
- ❌ EXECUTION COMMAND text (in SEMANTIC_API_GUIDELINES.md)
- ❌ 4-step execution pattern
- ❌ Request ID handling pattern
- ❌ Placeholder naming convention

## Template Checklist

Before committing a new/modified template:

- [ ] Includes `**INCLUDE**: templates/SEMANTIC_API_GUIDELINES.md`
- [ ] Defines specific role, authority, and action
- [ ] Lists all input parameters
- [ ] Provides complete output schema
- [ ] Includes full curl command with endpoint
- [ ] Follows 4-step execution pattern
- [ ] Has CRITICAL section with requestId warning
- [ ] Uses UPPERCASE_WITH_UNDERSCORES for placeholders
- [ ] Endpoint follows `/api/[name]-response` pattern
- [ ] Tested with actual Semantic API server

## Common Patterns

### Request ID Extraction
```markdown
**STEP 1**: Extract values from the prompt:
  - Find the line "Request ID: XXXXX" and extract the UUID
```

### Placeholder Replacement
```markdown
**STEP 3**: Replace ALL placeholders in the curl command:
  - REQUEST_ID_VALUE → the UUID from "Request ID:" line
  - FIELD_VALUE → the value from input
```

### Critical Warnings
```markdown
**CRITICAL**: 
- The requestId MUST be the exact UUID from the "Request ID:" line
- You MUST execute the curl command
```

## Testing Templates

### 1. Manual Test
```bash
# Start Semantic API server
npm run serve:semantic-api

# Send test request
curl -X POST http://localhost:8083/api/test-endpoint \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"test-123","field":"value"}'
```

### 2. Integration Test
Test with Kiro CLI session pool to ensure end-to-end functionality.

### 3. Validation
- Verify curl command executes
- Check response format
- Validate requestId handling
- Test error cases

## Reference Templates

Study these templates as examples:
- `POST-aipm-story-draft.md` - User story generation
- `POST-aipm-acceptance-test-draft.md` - Acceptance test generation
- `POST-aipm-invest-analysis.md` - INVEST analysis
- `POST-aipm-gwt-analysis.md` - GWT test analysis
- `POST-aipm-code-generation.md` - Code implementation

## Related Files

- `SEMANTIC_API_GUIDELINES.md` - AI-readable common sections
- `ACCEPTANCE_TEST_GUIDELINES.md` - Acceptance test guidelines
- `scripts/semantic-api-server-v2.js` - Semantic API server
- `scripts/kiro-session-pool.js` - Kiro CLI session pool
