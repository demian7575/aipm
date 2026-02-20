# AIPM Multi-Project Implementation Plan

**Version**: 1.0  
**Date**: 2026-02-20  
**Estimated Effort**: 4.5 hours

## Overview

This document provides step-by-step implementation instructions for adding multi-project support to AIPM.

## Prerequisites

- AIPM framework running (current state)
- AWS CLI configured
- Node.js 18+
- Access to AWS account

## Phase 1: Backend - Project Registry (2 hours)

### Step 1.1: Create Project Registry File (15 min)

**File**: `config/projects.yaml`

```bash
cat > config/projects.yaml << 'EOF'
# AIPM Framework Project Registry
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
EOF
```

### Step 1.2: Add Project Loader (30 min)

**File**: `apps/backend/projects.js` (NEW)

```javascript
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let projectsCache = null;
let lastLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute

export function loadProjects() {
  const now = Date.now();
  if (projectsCache && (now - lastLoadTime) < CACHE_TTL) {
    return projectsCache;
  }
  
  const configPath = join(__dirname, '../../config/projects.yaml');
  const content = readFileSync(configPath, 'utf-8');
  const config = parse(content);
  
  projectsCache = config.projects || [];
  lastLoadTime = now;
  
  return projectsCache;
}

export function getProject(projectId) {
  const projects = loadProjects();
  return projects.find(p => p.id === projectId);
}

export function addProject(project) {
  const projects = loadProjects();
  projects.push(project);
  saveProjects(projects);
  projectsCache = null; // Invalidate cache
}

export function updateProject(projectId, updates) {
  const projects = loadProjects();
  const index = projects.findIndex(p => p.id === projectId);
  if (index === -1) throw new Error('Project not found');
  
  projects[index] = { ...projects[index], ...updates };
  saveProjects(projects);
  projectsCache = null;
}

export function deleteProject(projectId) {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
  projectsCache = null;
}

function saveProjects(projects) {
  const { writeFileSync } = await import('fs');
  const { stringify } = await import('yaml');
  const configPath = join(__dirname, '../../config/projects.yaml');
  const content = stringify({ projects });
  writeFileSync(configPath, content, 'utf-8');
}
```

### Step 1.3: Add Project Middleware (30 min)

**File**: `apps/backend/app.js` (UPDATE)

Add at the top:
```javascript
import { getProject } from './projects.js';
```

Add middleware before routes:
```javascript
// Project context middleware
app.use((req, res, next) => {
  // Skip for project management endpoints
  if (req.url.startsWith('/api/projects') || req.url === '/health') {
    return next();
  }
  
  const projectId = req.headers['x-project-id'] || req.query.projectId;
  
  if (!projectId) {
    return sendJson(res, 400, { error: 'Project ID required. Use X-Project-Id header or projectId query param.' });
  }
  
  const project = getProject(projectId);
  
  if (!project) {
    return sendJson(res, 404, { error: `Project '${projectId}' not found` });
  }
  
  req.project = project;
  next();
});
```

### Step 1.4: Update DynamoDB Layer (30 min)

**File**: `apps/backend/dynamodb.js` (UPDATE)

Change constructor to accept project:
```javascript
class DynamoDB {
  constructor(project) {
    this.project = project;
    this.storiesTable = project.aws.dynamodb.stories;
    this.testsTable = project.aws.dynamodb.tests;
    this.prsTable = project.aws.dynamodb.prs;
    this.resultsTable = project.aws.dynamodb.results;
    
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ 
      region: project.aws.region 
    });
    this.docClient = DynamoDBDocumentClient.from(client);
  }
  
  // All methods remain the same, just use this.storiesTable, etc.
}
```

Update all route handlers to use project-specific DB:
```javascript
// Before
const db = new DynamoDB();

// After
const db = new DynamoDB(req.project);
```

### Step 1.5: Add Project Management Endpoints (30 min)

**File**: `apps/backend/app.js` (UPDATE)

Add before existing routes:
```javascript
// Project Management Endpoints
if (pathname === '/api/projects' && method === 'GET') {
  try {
    const projects = loadProjects();
    sendJson(res, 200, projects);
    return;
  } catch (error) {
    console.error('Error loading projects:', error);
    sendJson(res, 500, { error: 'Failed to load projects' });
    return;
  }
}

if (pathname === '/api/projects' && method === 'POST') {
  try {
    const body = await parseBody(req);
    
    // Validate required fields
    if (!body.id || !body.name || !body.github) {
      return sendJson(res, 400, { error: 'Missing required fields: id, name, github' });
    }
    
    // Check if project already exists
    const existing = getProject(body.id);
    if (existing) {
      return sendJson(res, 409, { error: 'Project already exists' });
    }
    
    const project = {
      id: body.id,
      name: body.name,
      description: body.description || '',
      github: body.github,
      aws: body.aws || {
        region: 'us-east-1',
        dynamodb: {
          stories: `${body.id}-stories`,
          tests: `${body.id}-tests`,
          prs: `${body.id}-prs`,
          results: `${body.id}-test-results`
        },
        s3: {
          documents: `${body.id}-documents`
        }
      },
      created: new Date().toISOString(),
      status: 'active'
    };
    
    addProject(project);
    sendJson(res, 201, project);
    return;
  } catch (error) {
    console.error('Error creating project:', error);
    sendJson(res, 500, { error: 'Failed to create project' });
    return;
  }
}

if (pathname.match(/^\/api\/projects\/[^\/]+$/) && method === 'GET') {
  try {
    const projectId = pathname.split('/')[3];
    const project = getProject(projectId);
    
    if (!project) {
      return sendJson(res, 404, { error: 'Project not found' });
    }
    
    sendJson(res, 200, project);
    return;
  } catch (error) {
    console.error('Error getting project:', error);
    sendJson(res, 500, { error: 'Failed to get project' });
    return;
  }
}

if (pathname.match(/^\/api\/projects\/[^\/]+$/) && method === 'DELETE') {
  try {
    const projectId = pathname.split('/')[3];
    const project = getProject(projectId);
    
    if (!project) {
      return sendJson(res, 404, { error: 'Project not found' });
    }
    
    deleteProject(projectId);
    sendJson(res, 200, { message: 'Project deleted' });
    return;
  } catch (error) {
    console.error('Error deleting project:', error);
    sendJson(res, 500, { error: 'Failed to delete project' });
    return;
  }
}
```

## Phase 2: Project Initialization Scripts (1 hour)

### Step 2.1: Create Project Init Script (30 min)

**File**: `scripts/project-init.sh` (NEW)

```bash
#!/bin/bash
set -e

PROJECT_ID=$1
PROJECT_NAME=$2
GITHUB_OWNER=$3
GITHUB_REPO=$4
AWS_REGION=${5:-us-east-1}

if [ -z "$PROJECT_ID" ] || [ -z "$PROJECT_NAME" ] || [ -z "$GITHUB_OWNER" ] || [ -z "$GITHUB_REPO" ]; then
  echo "Usage: $0 <project-id> <project-name> <github-owner> <github-repo> [aws-region]"
  echo "Example: $0 my-app 'My Application' myuser my-app us-east-1"
  exit 1
fi

echo "🚀 Initializing project: $PROJECT_NAME ($PROJECT_ID)"

# Create DynamoDB tables
echo "📦 Creating DynamoDB tables..."

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-stories \
  --attribute-definitions AttributeName=id,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-tests \
  --attribute-definitions \
    AttributeName=id,AttributeType=N \
    AttributeName=storyId,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=storyId-index,KeySchema=[{AttributeName=storyId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-prs \
  --attribute-definitions \
    AttributeName=id,AttributeType=N \
    AttributeName=storyId,AttributeType=N \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=storyId-index,KeySchema=[{AttributeName=storyId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

aws dynamodb create-table \
  --table-name ${PROJECT_ID}-test-results \
  --attribute-definitions \
    AttributeName=testId,AttributeType=S \
    AttributeName=runId,AttributeType=S \
  --key-schema \
    AttributeName=testId,KeyType=HASH \
    AttributeName=runId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION

# Create S3 bucket
echo "🪣 Creating S3 bucket..."
aws s3 mb s3://${PROJECT_ID}-documents --region $AWS_REGION || echo "Bucket may already exist"

# Register project via API
echo "📝 Registering project..."
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$PROJECT_ID\",
    \"name\": \"$PROJECT_NAME\",
    \"github\": {
      \"owner\": \"$GITHUB_OWNER\",
      \"repo\": \"$GITHUB_REPO\",
      \"branch\": \"main\"
    },
    \"aws\": {
      \"region\": \"$AWS_REGION\"
    }
  }"

echo ""
echo "✅ Project initialized successfully!"
echo ""
echo "Next steps:"
echo "1. Clone your project repo: git clone https://github.com/$GITHUB_OWNER/$GITHUB_REPO"
echo "2. Add .aipm/config.yaml to your project"
echo "3. Access AIPM and select '$PROJECT_NAME' from the project dropdown"
```

Make executable:
```bash
chmod +x scripts/project-init.sh
```

### Step 2.2: Create Project Delete Script (30 min)

**File**: `scripts/project-delete.sh` (NEW)

```bash
#!/bin/bash
set -e

PROJECT_ID=$1
CONFIRM=$2

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <project-id> [--confirm]"
  exit 1
fi

if [ "$CONFIRM" != "--confirm" ]; then
  echo "⚠️  WARNING: This will delete all AWS resources for project '$PROJECT_ID'"
  echo ""
  echo "This includes:"
  echo "  - DynamoDB tables (stories, tests, prs, results)"
  echo "  - S3 bucket (documents)"
  echo "  - Project registry entry"
  echo ""
  echo "To proceed, run: $0 $PROJECT_ID --confirm"
  exit 1
fi

echo "🗑️  Deleting project: $PROJECT_ID"

# Delete DynamoDB tables
echo "📦 Deleting DynamoDB tables..."
aws dynamodb delete-table --table-name ${PROJECT_ID}-stories || true
aws dynamodb delete-table --table-name ${PROJECT_ID}-tests || true
aws dynamodb delete-table --table-name ${PROJECT_ID}-prs || true
aws dynamodb delete-table --table-name ${PROJECT_ID}-test-results || true

# Delete S3 bucket (empty first)
echo "🪣 Deleting S3 bucket..."
aws s3 rm s3://${PROJECT_ID}-documents --recursive || true
aws s3 rb s3://${PROJECT_ID}-documents || true

# Unregister project
echo "📝 Unregistering project..."
curl -X DELETE http://localhost:4000/api/projects/$PROJECT_ID

echo ""
echo "✅ Project deleted successfully!"
```

Make executable:
```bash
chmod +x scripts/project-delete.sh
```

## Phase 3: Frontend UI (1 hour)

### Step 3.1: Add Project Selector HTML (15 min)

**File**: `apps/frontend/public/index.html` (UPDATE)

Update header section:
```html
<header class="app-header">
  <!-- Add project selector -->
  <div class="project-selector">
    <select id="project-dropdown" onchange="switchProject(this.value)">
      <!-- Populated dynamically -->
    </select>
    <button onclick="openProjectManager()" title="Manage Projects">⚙️</button>
  </div>
  
  <nav class="view-tabs">
    <button class="view-tab" data-view="mindmap">Mindmap</button>
    <button class="view-tab" data-view="kanban">Kanban</button>
    <button class="view-tab" data-view="rtm">RTM</button>
    <button class="view-tab" data-view="cicd">CI/CD</button>
  </nav>
</header>

<!-- Add project manager modal at end of body -->
<div id="project-manager-modal" class="modal" hidden>
  <div class="modal-content">
    <div class="modal-header">
      <h2>Project Manager</h2>
      <button onclick="closeProjectManager()">×</button>
    </div>
    
    <table class="projects-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>ID</th>
          <th>GitHub</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="projects-list">
        <!-- Populated dynamically -->
      </tbody>
    </table>
    
    <button onclick="openNewProjectForm()" class="btn-primary">+ New Project</button>
  </div>
</div>

<div id="new-project-modal" class="modal" hidden>
  <div class="modal-content">
    <div class="modal-header">
      <h2>New Project</h2>
      <button onclick="closeNewProjectForm()">×</button>
    </div>
    
    <form id="new-project-form" onsubmit="createProject(event)">
      <div class="form-group">
        <label>Project ID *</label>
        <input name="id" required pattern="[a-z0-9-]+" 
               placeholder="my-project" 
               title="Lowercase letters, numbers, and hyphens only" />
      </div>
      
      <div class="form-group">
        <label>Project Name *</label>
        <input name="name" required placeholder="My Project" />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea name="description" placeholder="Project description"></textarea>
      </div>
      
      <div class="form-group">
        <label>GitHub Owner *</label>
        <input name="github_owner" required placeholder="username" />
      </div>
      
      <div class="form-group">
        <label>GitHub Repo *</label>
        <input name="github_repo" required placeholder="repo-name" />
      </div>
      
      <div class="form-actions">
        <button type="button" onclick="closeNewProjectForm()">Cancel</button>
        <button type="submit" class="btn-primary">Create Project</button>
      </div>
    </form>
  </div>
</div>
```

### Step 3.2: Add Project Selector CSS (15 min)

**File**: `apps/frontend/public/styles.css` (UPDATE)

Add at end:
```css
/* Project Selector */
.project-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 2rem;
}

#project-dropdown {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  min-width: 200px;
}

.project-selector button {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 16px;
}

.project-selector button:hover {
  background: #f5f5f5;
}

/* Project Manager Modal */
.projects-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.projects-table th,
.projects-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.projects-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.projects-table button {
  padding: 0.25rem 0.5rem;
  margin: 0 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.projects-table button:hover {
  background: #f5f5f5;
}

.projects-table button.danger:hover {
  background: #fee;
  border-color: #fcc;
  color: #c00;
}

/* Form Styles */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #0056b3;
}
```

### Step 3.3: Add Project Selector JavaScript (30 min)

**File**: `apps/frontend/public/app.js` (UPDATE)

Add at top of file:
```javascript
// Project Management
let projects = [];
let activeProjectId = localStorage.getItem('aipm-active-project') || 'aipm';

async function loadProjects() {
  try {
    const response = await fetch(resolveApiUrl('/api/projects'));
    if (!response.ok) throw new Error('Failed to load projects');
    projects = await response.json();
    updateProjectDropdown();
  } catch (error) {
    console.error('Error loading projects:', error);
    showToast('Failed to load projects', 'error');
  }
}

function updateProjectDropdown() {
  const dropdown = document.getElementById('project-dropdown');
  dropdown.innerHTML = projects.map(p => 
    `<option value="${p.id}" ${p.id === activeProjectId ? 'selected' : ''}>${p.name}</option>`
  ).join('');
}

function switchProject(projectId) {
  localStorage.setItem('aipm-active-project', projectId);
  activeProjectId = projectId;
  location.reload();
}

function openProjectManager() {
  const modal = document.getElementById('project-manager-modal');
  modal.hidden = false;
  renderProjectsList();
}

function closeProjectManager() {
  document.getElementById('project-manager-modal').hidden = true;
}

function renderProjectsList() {
  const tbody = document.getElementById('projects-list');
  tbody.innerHTML = projects.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><code>${p.id}</code></td>
      <td>${p.github.owner}/${p.github.repo}</td>
      <td><span class="badge">${p.status}</span></td>
      <td>
        <button onclick="selectProject('${p.id}')">Select</button>
        <button class="danger" onclick="confirmDeleteProject('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function selectProject(projectId) {
  switchProject(projectId);
}

function confirmDeleteProject(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!confirm(`Delete project "${project.name}"? This will remove all data.`)) {
    return;
  }
  deleteProject(projectId);
}

async function deleteProject(projectId) {
  try {
    const response = await fetch(resolveApiUrl(`/api/projects/${projectId}`), {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete project');
    
    showToast('Project deleted', 'success');
    await loadProjects();
    renderProjectsList();
    
    if (projectId === activeProjectId) {
      switchProject('aipm');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    showToast('Failed to delete project', 'error');
  }
}

function openNewProjectForm() {
  document.getElementById('new-project-modal').hidden = false;
}

function closeNewProjectForm() {
  document.getElementById('new-project-modal').hidden = true;
  document.getElementById('new-project-form').reset();
}

async function createProject(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const project = {
    id: formData.get('id'),
    name: formData.get('name'),
    description: formData.get('description'),
    github: {
      owner: formData.get('github_owner'),
      repo: formData.get('github_repo'),
      branch: 'main'
    }
  };
  
  try {
    const response = await fetch(resolveApiUrl('/api/projects'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }
    
    showToast('Project created! Run project-init.sh to initialize AWS resources.', 'success');
    closeNewProjectForm();
    await loadProjects();
    renderProjectsList();
  } catch (error) {
    console.error('Error creating project:', error);
    showToast(error.message, 'error');
  }
}
```

Update all API calls to include project header:
```javascript
// Update apiCall helper or add to all fetch calls
async function apiCall(endpoint, options = {}) {
  const url = resolveApiUrl(endpoint);
  const headers = {
    'X-Project-Id': activeProjectId,
    ...options.headers
  };
  
  return fetch(url, { ...options, headers });
}
```

Update initialization:
```javascript
// In init() or DOMContentLoaded
await loadProjects();
```

## Phase 4: Migration & Testing (30 min)

### Step 4.1: Create AIPM Project Config (5 min)

```bash
mkdir -p .aipm
cat > .aipm/config.yaml << 'EOF'
project:
  id: aipm
  name: "AI Project Manager"
  description: "AIPM framework itself"
  version: "1.0.0"

aipm:
  framework_version: "1.0.0"

github:
  owner: demian7575
  repo: aipm
  default_branch: main

aws:
  region: us-east-1

settings:
  auto_generate_tests: true
  require_acceptance_criteria: true
  default_story_status: "Backlog"
  enable_invest_validation: true
EOF
```

### Step 4.2: Test with Existing AIPM Project (10 min)

```bash
# Restart backend
cd apps/backend
npm start

# Test project API
curl http://localhost:4000/api/projects

# Test story API with project header
curl -H "X-Project-Id: aipm" http://localhost:4000/api/stories

# Open frontend and verify project selector shows "AIPM"
```

### Step 4.3: Create Test Project (15 min)

```bash
# Initialize test project
./scripts/project-init.sh test-project "Test Project" myuser test-repo

# Verify tables created
aws dynamodb list-tables | grep test-project

# Test in frontend
# 1. Open AIPM
# 2. Click project dropdown
# 3. Select "Test Project"
# 4. Create a test story
# 5. Verify it's in test-project-stories table
```

## Verification Checklist

- [ ] `config/projects.yaml` exists with AIPM project
- [ ] Backend starts without errors
- [ ] `/api/projects` returns project list
- [ ] Project dropdown shows in frontend
- [ ] Can switch between projects
- [ ] Stories API requires X-Project-Id header
- [ ] Project manager modal opens
- [ ] Can create new project via UI
- [ ] `project-init.sh` creates AWS resources
- [ ] Test project is isolated from AIPM project
- [ ] Can delete test project

## Rollback Plan

If issues occur:

1. **Revert backend changes**:
   ```bash
   git checkout apps/backend/app.js apps/backend/dynamodb.js
   ```

2. **Remove project files**:
   ```bash
   rm config/projects.yaml
   rm apps/backend/projects.js
   ```

3. **Restart services**:
   ```bash
   sudo systemctl restart aipm-backend
   ```

## Next Steps

After successful implementation:

1. Update documentation
2. Create project setup guide for users
3. Add project import/export features
4. Consider adding user authentication
5. Add cross-project analytics

## Support

For issues during implementation:
- Check logs: `sudo journalctl -u aipm-backend -f`
- Verify AWS resources: `aws dynamodb list-tables`
- Test API directly: `curl -v http://localhost:4000/api/projects`
