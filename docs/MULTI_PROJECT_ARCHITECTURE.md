# AIPM Multi-Project Architecture

**Version**: 1.0  
**Date**: 2026-02-20  
**Status**: Planning

## Overview

This document describes the architecture for separating AIPM into:
1. **AIPM Framework** - The tool itself (this repository)
2. **Target Projects** - Projects managed by AIPM (separate repositories)

## Current State

- Single monolithic application
- AIPM manages itself (self-referential)
- Hardcoded database tables
- No project isolation

## Target Architecture

```
┌─────────────────────────────────────────────────┐
│         AIPM Framework (this repo)              │
│  - Frontend UI (project-agnostic)               │
│  - Backend API (multi-project aware)            │
│  - Semantic API / Kiro integration              │
│  - Core logic & templates                       │
└─────────────────────────────────────────────────┘
                      │
                      │ manages
                      ▼
┌─────────────────────────────────────────────────┐
│              Project Registry                    │
│  config/projects.yaml                           │
│  - List of all projects                         │
│  - Project metadata                             │
│  - Connection configs                           │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Project │  │ Project │  │ Project │
   │   AIPM  │  │   MyApp │  │  Other  │
   └─────────┘  └─────────┘  └─────────┘
   
   Each project has:
   - Own GitHub repository
   - Own DynamoDB tables
   - Own S3 buckets
   - Own CI/CD configuration
   - Own documentation
```

## Benefits

1. **Clean Separation**: Framework code separate from project data
2. **Scalability**: Manage unlimited projects from one AIPM instance
3. **Isolation**: Each project has independent AWS resources
4. **Flexibility**: Different AWS regions, GitHub orgs per project
5. **Portability**: Easy to export/import/delete projects
6. **Multi-user Ready**: Foundation for user-based access control

## Design Principles

1. **Framework is stateless** - All project data lives in project-specific resources
2. **Projects are independent** - Deleting a project doesn't affect others
3. **Configuration over code** - Project settings in YAML, not hardcoded
4. **Convention over configuration** - Sensible defaults, minimal setup
5. **Backward compatible** - Existing AIPM data becomes first project

## Repository Structure

### AIPM Framework Repository (this repo)

```
aipm/                                    # Framework repo
├── apps/
│   ├── frontend/                       # Project-agnostic UI
│   │   └── public/
│   │       ├── app.js                  # Updated: project selector
│   │       ├── index.html              # Updated: project dropdown
│   │       └── styles.css
│   ├── backend/                        # Multi-project API
│   │   ├── app.js                      # Updated: project middleware
│   │   ├── dynamodb.js                 # Updated: dynamic table names
│   │   └── server.js
│   └── semantic-api/                   # AI services (unchanged)
├── config/
│   ├── environments.yaml               # EC2/infrastructure config
│   └── projects.yaml                   # ⭐ NEW: Project registry
├── scripts/
│   ├── project-init.sh                 # ⭐ NEW: Initialize new project
│   ├── project-delete.sh               # ⭐ NEW: Delete project
│   └── testing/
├── templates/                          # Framework templates
│   └── POST-aipm-*.md
├── .aipm/                              # ⭐ NEW: AIPM as a project
│   └── config.yaml
├── docs/
│   ├── MULTI_PROJECT_ARCHITECTURE.md   # This document
│   └── PROJECT_SETUP_GUIDE.md          # ⭐ NEW: How to add projects
└── README.md
```

### Target Project Repository

```
my-project/                              # Target project repo
├── .aipm/                              # ⭐ AIPM configuration
│   ├── config.yaml                     # Project config
│   ├── stories/                        # Optional: story backups
│   └── templates/                      # Project-specific templates
├── src/                                # Project source code
├── docs/                               # Project documentation
├── tests/                              # Project tests
├── .github/
│   └── workflows/
│       └── aipm-deploy.yml             # CI/CD integration
└── README.md
```

## Configuration Files

### Project Registry (`config/projects.yaml`)

```yaml
# AIPM Framework Project Registry
# This file lists all projects managed by this AIPM instance

projects:
  - id: aipm
    name: "AI Project Manager"
    description: "AIPM framework itself"
    github:
      owner: demian7575
      repo: aipm
      branch: main
    aws:
      region: us-east-1
      dynamodb:
        stories: aipm-backend-prod-stories
        tests: aipm-backend-prod-acceptance-tests
        prs: aipm-backend-prod-prs
        results: aipm-backend-prod-test-results
      s3:
        documents: aipm-documents
    created: "2026-02-18T00:00:00Z"
    status: active
    
  - id: my-app
    name: "My Application"
    description: "Web application for customer management"
    github:
      owner: myuser
      repo: my-app
      branch: main
    aws:
      region: us-east-1
      dynamodb:
        stories: my-app-stories
        tests: my-app-tests
        prs: my-app-prs
        results: my-app-test-results
      s3:
        documents: my-app-documents
    created: "2026-02-20T00:00:00Z"
    status: active
```

### Project Config (`.aipm/config.yaml` in each project repo)

```yaml
# AIPM Project Configuration
# This file lives in the target project repository

project:
  id: my-app
  name: "My Application"
  description: "Web application for customer management"
  version: "1.0.0"
  
aipm:
  framework_version: "1.0.0"
  framework_url: "http://aipm-frontend.s3-website.amazonaws.com"
  api_url: "http://ec2-ip:4000"
  
github:
  owner: myuser
  repo: my-app
  default_branch: main
  pr_template: ".aipm/templates/pr-template.md"
  
aws:
  region: us-east-1
  profile: default
  
settings:
  auto_generate_tests: true
  require_acceptance_criteria: true
  default_story_status: "Backlog"
  story_id_prefix: "MA"
  enable_invest_validation: true
  
templates:
  story_draft: ".aipm/templates/story-draft.md"
  acceptance_test: ".aipm/templates/acceptance-test.md"
```

## API Changes

### New Endpoints

```
# Project Management
GET    /api/projects              # List all projects
POST   /api/projects              # Register new project
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project config
DELETE /api/projects/:id          # Unregister project
POST   /api/projects/:id/init     # Initialize project (create AWS resources)
POST   /api/projects/:id/export   # Export project data
POST   /api/projects/:id/import   # Import project data

# Health check per project
GET    /api/projects/:id/health   # Check project AWS resources
```

### Updated Endpoints

All existing endpoints now require `X-Project-Id` header or `projectId` query parameter:

```
# Before
GET /api/stories

# After
GET /api/stories
Headers: X-Project-Id: aipm

# Or
GET /api/stories?projectId=aipm
```

### Backend Middleware

```javascript
// Project context middleware
app.use(async (req, res, next) => {
  const projectId = req.headers['x-project-id'] || req.query.projectId;
  
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }
  
  const project = await loadProject(projectId);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  req.project = project;
  req.db = new DynamoDB(project); // Project-specific DB instance
  next();
});
```

## Frontend Changes

### Project Selector UI

```html
<!-- Header with project selector -->
<header class="app-header">
  <div class="project-selector">
    <select id="project-dropdown" onchange="switchProject(this.value)">
      <option value="aipm">AIPM</option>
      <option value="my-app">My Application</option>
    </select>
    <button onclick="openProjectManager()">⚙️</button>
  </div>
  
  <nav class="view-tabs">
    <button data-view="mindmap">Mindmap</button>
    <button data-view="kanban">Kanban</button>
    <button data-view="rtm">RTM</button>
    <button data-view="cicd">CI/CD</button>
  </nav>
</header>
```

### Project Manager Modal

```html
<div id="project-manager-modal" class="modal">
  <div class="modal-content">
    <h2>Project Manager</h2>
    
    <table class="projects-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>GitHub</th>
          <th>Status</th>
          <th>Stories</th>
          <th>Tests</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="projects-list">
        <!-- Populated dynamically -->
      </tbody>
    </table>
    
    <button onclick="openNewProjectForm()">+ New Project</button>
  </div>
</div>
```

### JavaScript Changes

```javascript
// Store active project in localStorage
function switchProject(projectId) {
  localStorage.setItem('aipm-active-project', projectId);
  location.reload();
}

// Add project header to all API calls
async function apiCall(endpoint, options = {}) {
  const projectId = localStorage.getItem('aipm-active-project') || 'aipm';
  
  const response = await fetch(resolveApiUrl(endpoint), {
    ...options,
    headers: {
      'X-Project-Id': projectId,
      ...options.headers
    }
  });
  
  return response;
}
```

## Database Schema

### No Changes to Table Structure

Each project gets its own set of tables with the same schema:

```
{projectId}-stories
{projectId}-tests
{projectId}-prs
{projectId}-test-results
```

Example:
- `aipm-backend-prod-stories` → `aipm-stories`
- `my-app-stories`
- `other-project-stories`

### Table Naming Convention

```
{projectId}-{resource}

Where:
- projectId: lowercase, alphanumeric + hyphens
- resource: stories | tests | prs | results
```

## AWS Resource Naming

### DynamoDB Tables
```
{projectId}-stories
{projectId}-tests
{projectId}-prs
{projectId}-test-results
```

### S3 Buckets
```
{projectId}-documents
{projectId}-frontend (optional, if project has own frontend)
```

### IAM Policies
```
aipm-project-{projectId}-policy
```

## Implementation Plan

See [MULTI_PROJECT_IMPLEMENTATION.md](./MULTI_PROJECT_IMPLEMENTATION.md) for detailed implementation steps.

## Migration Strategy

### Phase 1: Backward Compatibility
1. Keep existing table names for AIPM project
2. Add project registry with AIPM as first project
3. Update backend to support both old and new table names
4. Frontend defaults to AIPM project

### Phase 2: Add Multi-Project Support
1. Add project selector UI
2. Add project management endpoints
3. Test with second project

### Phase 3: Full Migration (Optional)
1. Rename AIPM tables to follow convention
2. Remove backward compatibility code

## Security Considerations

1. **Project Isolation**: Each project has separate AWS resources
2. **Access Control**: Future: Add user authentication and project permissions
3. **API Keys**: Future: Per-project API keys for external integrations
4. **Data Export**: Projects can be exported and deleted cleanly

## Future Enhancements

1. **User Authentication**: Multi-user support with project-based permissions
2. **Project Templates**: Quick-start templates for common project types
3. **Project Sharing**: Share projects between AIPM instances
4. **Project Analytics**: Cross-project metrics and reporting
5. **Project Archival**: Archive inactive projects to reduce costs

## Questions & Decisions

### Decided
- ✅ Use separate tables per project (not multi-tenant)
- ✅ Use slug-based project IDs (not UUIDs)
- ✅ One GitHub repo per project
- ✅ Keep AIPM as first project (backward compatible)

### To Decide
- ⏳ Authentication strategy (future)
- ⏳ Project import/export format
- ⏳ Cross-project search/reporting
- ⏳ Project quotas/limits

## References

- [Project Setup Guide](./PROJECT_SETUP_GUIDE.md)
- [Implementation Plan](./MULTI_PROJECT_IMPLEMENTATION.md)
- [API Documentation](./API.md)
