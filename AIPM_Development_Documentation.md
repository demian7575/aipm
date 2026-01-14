# AIPM Development Documentation

**Version:** 1.0  
**Date:** January 2026  
**Author:** Development Team  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Environment Setup](#3-environment-setup)
4. [Core Components](#4-core-components)
5. [Development Workflows](#5-development-workflows)
6. [Deployment Guide](#6-deployment-guide)
7. [Testing Framework](#7-testing-framework)
8. [Security & Compliance](#8-security--compliance)
9. [API Reference](#9-api-reference)
10. [Frontend Development](#10-frontend-development)
11. [Data Management](#11-data-management)
12. [Integration Points](#12-integration-points)
13. [Monitoring & Logging](#13-monitoring--logging)
14. [Troubleshooting Guide](#14-troubleshooting-guide)
15. [Configuration Management](#15-configuration-management)
16. [Development Best Practices](#16-development-best-practices)
17. [Maintenance & Operations](#17-maintenance--operations)
18. [Appendices](#18-appendices)

---

## 1. Introduction

### 1.1 Overview of AIPM

The AI Project Manager (AIPM) is a self-hosted mindmap and outline workspace designed for managing merge-request user stories, acceptance tests, and reference documentation. The system provides a comprehensive solution for project management with integrated GitHub workflows and AI-assisted code generation.

### 1.2 Purpose and Scope

This document serves as the complete development guide for AIPM, covering:
- System architecture and components
- Development setup and workflows
- Deployment procedures
- Testing and quality assurance
- Security and compliance requirements
- Maintenance and operations

### 1.3 Target Audience

- Software developers working on AIPM
- DevOps engineers managing deployments
- Project managers using the system
- System administrators maintaining the infrastructure

### 1.4 Document Structure

This documentation is organized into logical sections, progressing from basic setup to advanced operations. Each section includes practical examples and code snippets where applicable.

---

## 2. System Architecture

### 2.1 High-Level Architecture

AIPM follows a cloud-native three-tier architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (S3 Static)   │◄──►│   (EC2 Node.js) │◄──►│   (DynamoDB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Actions│    │   GitHub API    │    │   AWS Services  │
│   (CI/CD)       │    │   Integration   │    │   (S3, IAM)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Dual Environment Setup:**
- **Production**: EC2 (44.220.45.57) + S3 (aipm-static-hosting-demo)
- **Development**: EC2 (44.222.168.46) + S3 (aipm-dev-frontend-hosting)
- **Kiro API**: Port 8081 on development server for AI code generation

### 2.2 Component Overview

**Frontend Components:**
- Vanilla JavaScript application
- SVG-based mindmap visualization
- Modal-driven editing workflows
- Real-time data synchronization

**Backend Components:**
- Node.js HTTP server
- RESTful API endpoints
- DynamoDB integration
- GitHub API integration
- Health monitoring

**Infrastructure Components:**
- AWS EC2 instances (production and development)
- AWS DynamoDB tables
- AWS S3 buckets for static hosting
- GitHub Actions for CI/CD

### 2.3 Technology Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- SVG for mindmap visualization
- No external frameworks or libraries

**Backend:**
- Node.js (v18+)
- Built-in HTTP module
- AWS SDK for JavaScript v3
- Express.js (v5.1.0) for enhanced routing
- DynamoDB DocumentClient for data operations

**Database:**
- AWS DynamoDB (NoSQL)
- Document-based storage
- On-demand billing mode
- Dual environment tables (prod/dev)

**Infrastructure:**
- AWS EC2 (t3.micro instances) - Dual environment
- AWS S3 (static website hosting) - Dual buckets
- AWS IAM (access management)
- GitHub Actions (CI/CD)
- Kiro API integration (port 8081)

### 2.4 Infrastructure Diagram

```
Production Environment:
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                           │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   S3 Bucket     │    │   EC2 Instance  │                │
│  │   Frontend      │    │   Backend API   │                │
│  │   44.220.45.57  │    │   44.220.45.57  │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           └───────────────────────┼────────────────────┐   │
│                                   │                    │   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────▼───┐ │
│  │   DynamoDB      │    │   S3 Bucket     │    │   IAM    │ │
│  │   Stories       │    │   Deployments   │    │   Roles  │ │
│  │   Tests         │    │   Assets        │    │          │ │
│  └─────────────────┘    └─────────────────┘    └──────────┘ │
└─────────────────────────────────────────────────────────────┘

Development Environment:
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                           │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   S3 Bucket     │    │   EC2 Instance  │                │
│  │   Dev Frontend  │    │   Dev Backend   │                │
│  │   44.222.168.46 │    │   44.222.168.46 │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           └───────────────────────┼────────────────────┐   │
│                                   │                    │   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────▼───┐ │
│  │   DynamoDB      │    │   Kiro API      │    │   IAM    │ │
│  │   Dev Tables    │    │   Port 8081     │    │   Roles  │ │
│  │                 │    │                 │    │          │ │
│  └─────────────────┘    └─────────────────┘    └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Data Flow Architecture

```
User Interaction Flow:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───►│Frontend │───►│Backend  │───►│DynamoDB │
│Interface│    │   JS    │    │   API   │    │ Tables  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     ▲              │              │              │
     │              ▼              ▼              ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│Response │◄───│ Render  │◄───│Response │◄───│  Data   │
│Display  │    │ Update  │    │  JSON   │    │Retrieval│
└─────────┘    └─────────┘    └─────────┘    └─────────┘

GitHub Integration Flow:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───►│Frontend │───►│Backend  │───►│GitHub   │
│ Action  │    │Request  │    │   API   │    │   API   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     ▲              │              │              │
     │              ▼              ▼              ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   UI    │◄───│ Update  │◄───│Response │◄───│   PR    │
│ Update  │    │ State   │    │Handler  │    │Creation │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

---

## 3. Environment Setup

### 3.1 Prerequisites

**System Requirements:**
- Node.js 18 or newer
- Python 3.8+ (optional, for development tools)
- macOS, Linux, or WSL shell with Bash-compatible tooling
- Git version control
- AWS CLI configured
- GitHub CLI (optional)

**AWS Account Requirements:**
- AWS account with appropriate permissions
- IAM user with DynamoDB, S3, and EC2 access
- AWS CLI configured with credentials

**GitHub Requirements:**
- GitHub account with repository access
- Personal access token with repo permissions
- SSH key configured for EC2 access (for manual deployments)

### 3.2 Local Development Setup

**1. Clone the Repository:**
```bash
git clone https://github.com/demian7575/aipm.git
cd aipm
```

**2. Install Dependencies:**
```bash
npm install
```
Note: The project uses Node.js built-ins, so no packages are downloaded.

**3. Environment Variables:**
Create a `.env` file in the project root:
```bash
# GitHub Integration
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=demian7575
GITHUB_REPO=aipm

# AWS Configuration
AWS_REGION=us-east-1
STORIES_TABLE=aipm-backend-prod-stories
ACCEPTANCE_TESTS_TABLE=aipm-backend-prod-acceptance-tests

# Application Configuration
PROD_VERSION=4.0.0
STAGE=prod
DEBUG=false
```

**4. AWS Configuration:**
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

**5. Start Development Server:**
```bash
npm run dev
```

This starts:
- API server on port 4000 (with auto-retry on next available port)
- Delegation server on port 4100
- Static frontend served by the backend

### 3.3 Environment Variables

**Required Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub personal access token | `ghp_xxxxxxxxxxxx` |
| `STORIES_TABLE` | DynamoDB stories table name | `aipm-backend-prod-stories` |
| `ACCEPTANCE_TESTS_TABLE` | DynamoDB tests table name | `aipm-backend-prod-acceptance-tests` |

**Optional Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_OWNER` | GitHub repository owner | `demian7575` |
| `GITHUB_REPO` | GitHub repository name | `aipm` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `PROD_VERSION` | Application version | `4.0.0` |
| `STAGE` | Environment stage | `prod` |
| `DEBUG` | Enable debug logging | `false` |

**OpenAI Integration (Optional):**

| Variable | Description |
|----------|-------------|
| `AI_PM_OPENAI_API_KEY` | OpenAI API key for INVEST analysis |
| `AI_PM_OPENAI_API_URL` | Custom OpenAI endpoint URL |
| `AI_PM_OPENAI_MODEL` | Model name (default: gpt-4o-mini) |
| `AI_PM_DISABLE_OPENAI` | Set to '1' to disable OpenAI |

### 3.4 AWS Configuration

**DynamoDB Tables:**

The system requires two DynamoDB tables:

**Stories Table:**
```bash
aws dynamodb create-table \
    --table-name aipm-backend-prod-stories \
    --attribute-definitions AttributeName=id,AttributeType=N \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

**Acceptance Tests Table:**
```bash
aws dynamodb create-table \
    --table-name aipm-backend-prod-acceptance-tests \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

**S3 Buckets:**

**Production Frontend:**
```bash
aws s3 mb s3://aipm-static-hosting-demo --region us-east-1
aws s3 website s3://aipm-static-hosting-demo \
    --index-document index.html \
    --error-document index.html
```

**Development Frontend:**
```bash
aws s3 mb s3://aipm-dev-frontend-hosting --region us-east-1
aws s3 website s3://aipm-dev-frontend-hosting \
    --index-document index.html \
    --error-document index.html
```

**Deployment Assets:**
```bash
aws s3 mb s3://aipm-deployments-728378229251 --region us-east-1
```

### 3.5 GitHub Integration Setup

**1. Create Personal Access Token:**
- Go to GitHub Settings > Developer settings > Personal access tokens
- Generate new token with `repo` permissions
- Copy token and add to environment variables

**2. Configure Repository Secrets:**
For GitHub Actions, add these secrets to your repository:
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `GITHUB_TOKEN`: GitHub personal access token

**3. Webhook Configuration (Optional):**
If using webhooks for real-time updates:
- Repository Settings > Webhooks
- Payload URL: `https://your-backend-url/webhook`
- Content type: `application/json`
- Events: Push, Pull requests, Issues

---
## 4. Core Components

### 4.1 Backend API (Node.js)

#### 4.1.1 Current File Structure

```
apps/backend/
├── app.js           # Main HTTP server + DynamoDB integration
├── server.js        # CLI entry point for development
├── dynamodb.js      # DynamoDB helper functions  
└── story-prs.js     # GitHub PR management functions
```

#### 4.1.2 Server Architecture

The backend is built using Node.js with Express.js for enhanced routing and AWS SDK v3 for DynamoDB integration:

```javascript
// Core server structure (app.js)
const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const app = express();
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Middleware
app.use(express.json());
app.use(express.static('apps/frontend/public'));

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

**Key Features:**
- RESTful API design
- JSON request/response handling
- CORS support for cross-origin requests
- Error handling and logging
- Health check endpoints

#### 4.1.2 API Endpoints

**Stories Management:**
```
GET    /api/stories              - Get all stories
POST   /api/stories              - Create new story
GET    /api/stories/:id          - Get specific story
PUT    /api/stories/:id          - Update story
DELETE /api/stories/:id          - Delete story
POST   /api/stories/:id/health-check - Run INVEST analysis
```

**Acceptance Tests:**
```
GET    /api/acceptance-tests     - Get all acceptance tests
POST   /api/acceptance-tests     - Create new test
PUT    /api/acceptance-tests/:id - Update test
DELETE /api/acceptance-tests/:id - Delete test
```

**GitHub Integration:**
```
POST   /api/create-pr            - Create GitHub pull request
POST   /api/trigger-deployment   - Trigger deployment workflow
POST   /api/merge-pr             - Merge pull request
GET    /api/github-status        - Check GitHub token status
```

**System Health:**
```
GET    /health                   - Basic health check
GET    /api/github-status        - GitHub integration status
```

#### 4.1.3 DynamoDB Integration

**Connection Setup (AWS SDK v3):**
```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
```

**Current Table Structure:**
- **Production Tables:**
  - `aipm-backend-prod-stories`
  - `aipm-backend-prod-acceptance-tests`
  - `aipm-backend-prod-prs`
- **Development Tables:**
  - `aipm-backend-dev-stories`
  - `aipm-backend-dev-acceptance-tests`
  - `aipm-backend-dev-prs`

**Data Operations:**
```javascript
// Get all stories
async function getAllStories() {
  const command = new ScanCommand({
    TableName: process.env.STORIES_TABLE
  });
  const result = await docClient.send(command);
  return result.Items;
}

// Create story
async function createStory(story) {
  const command = new PutCommand({
    TableName: process.env.STORIES_TABLE,
    Item: {
      id: Date.now(),
      ...story,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
  await docClient.send(command);
}
```

#### 4.1.4 GitHub API Integration

**Authentication:**
```javascript
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const headers = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
};
```

**Create Pull Request:**
```javascript
async function createPullRequest(branchName, title, body) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        body,
        head: branchName,
        base: 'main'
      })
    }
  );
  return response.json();
}
```

### 4.2 Frontend (Vanilla JavaScript)

#### 4.2.1 UI Components

**Main Interface Structure:**
```html
<div id="app">
  <header class="header">
    <div class="header-controls">
      <button id="toggle-outline">Outline</button>
      <button id="toggle-mindmap">Mindmap</button>
      <button id="toggle-details">Details</button>
    </div>
  </header>
  
  <main class="main-content">
    <div id="outline-panel" class="panel">
      <!-- Story outline tree -->
    </div>
    
    <div id="mindmap-panel" class="panel">
      <svg id="mindmap-svg">
        <!-- SVG mindmap visualization -->
      </svg>
    </div>
    
    <div id="details-panel" class="panel">
      <!-- Story details and editing -->
    </div>
  </main>
</div>
```

**Component Initialization:**
```javascript
// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  loadStories();
  setupEventListeners();
  restoreUIState();
});

function initializeApp() {
  // Initialize panels
  initializeOutline();
  initializeMindmap();
  initializeDetails();
  
  // Setup real-time updates
  setupWebSocket();
}
```

#### 4.2.2 Mindmap Visualization

**SVG Mindmap Creation:**
```javascript
function createMindmapNode(story, x, y) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${x}, ${y})`);
  
  // Create rectangle
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', 200);
  rect.setAttribute('height', 80);
  rect.setAttribute('rx', 5);
  rect.setAttribute('class', 'story-node');
  
  // Create text
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', 100);
  text.setAttribute('y', 40);
  text.setAttribute('text-anchor', 'middle');
  text.textContent = story.title;
  
  group.appendChild(rect);
  group.appendChild(text);
  
  return group;
}
```

**Layout Algorithm:**
```javascript
function layoutMindmap(stories) {
  const positions = new Map();
  const rootStory = stories.find(s => !s.parentId);
  
  if (rootStory) {
    positions.set(rootStory.id, { x: 400, y: 300 });
    layoutChildren(rootStory, stories, positions, 400, 300, 0);
  }
  
  return positions;
}

function layoutChildren(parent, stories, positions, parentX, parentY, level) {
  const children = stories.filter(s => s.parentId === parent.id);
  const angleStep = Math.PI * 2 / Math.max(children.length, 1);
  const radius = 150 + (level * 50);
  
  children.forEach((child, index) => {
    const angle = angleStep * index;
    const x = parentX + Math.cos(angle) * radius;
    const y = parentY + Math.sin(angle) * radius;
    
    positions.set(child.id, { x, y });
    layoutChildren(child, stories, positions, x, y, level + 1);
  });
}
```

#### 4.2.3 Story Management Interface

**Story Creation Modal:**
```javascript
function showCreateStoryModal(parentId = null) {
  const modal = document.getElementById('create-story-modal');
  const form = modal.querySelector('form');
  
  // Reset form
  form.reset();
  if (parentId) {
    form.querySelector('[name="parentId"]').value = parentId;
  }
  
  // Show modal
  modal.style.display = 'block';
  
  // Focus first input
  form.querySelector('input').focus();
}

function handleStorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const story = Object.fromEntries(formData.entries());
  
  // Validate story
  if (!story.title || !story.description) {
    showError('Title and description are required');
    return;
  }
  
  // Create story
  createStory(story);
}
```

**INVEST Validation:**
```javascript
function validateINVEST(story) {
  const warnings = [];
  
  // Independent
  if (story.dependencies && story.dependencies.length > 3) {
    warnings.push({
      criterion: 'independent',
      message: 'Story has many dependencies',
      suggestion: 'Consider breaking into smaller, more independent stories'
    });
  }
  
  // Negotiable
  if (story.description.length < 50) {
    warnings.push({
      criterion: 'negotiable',
      message: 'Description is very brief',
      suggestion: 'Add more detail to enable discussion and negotiation'
    });
  }
  
  // Valuable
  if (!story.soThat || story.soThat.length < 20) {
    warnings.push({
      criterion: 'valuable',
      message: 'Business value not clearly stated',
      suggestion: 'Clarify the "so that" clause to show user value'
    });
  }
  
  // Estimable
  if (!story.storyPoint || story.storyPoint > 13) {
    warnings.push({
      criterion: 'estimable',
      message: 'Story is too large to estimate accurately',
      suggestion: 'Break down into smaller, more estimable pieces'
    });
  }
  
  // Small
  if (story.storyPoint > 8) {
    warnings.push({
      criterion: 'small',
      message: 'Story is too large for a single sprint',
      suggestion: 'Split into multiple smaller stories'
    });
  }
  
  // Testable
  if (!story.acceptanceTests || story.acceptanceTests.length === 0) {
    warnings.push({
      criterion: 'testable',
      message: 'No acceptance tests defined',
      suggestion: 'Add specific, testable acceptance criteria'
    });
  }
  
  return warnings;
}
```

#### 4.2.4 Modal Workflows

**Modal Management System:**
```javascript
class ModalManager {
  constructor() {
    this.activeModal = null;
    this.setupEventListeners();
  }
  
  show(modalId, options = {}) {
    this.hide(); // Hide any existing modal
    
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    this.activeModal = modal;
    modal.style.display = 'block';
    
    // Focus management
    const firstInput = modal.querySelector('input, textarea, select');
    if (firstInput) firstInput.focus();
    
    // Setup close handlers
    this.setupCloseHandlers(modal);
  }
  
  hide() {
    if (this.activeModal) {
      this.activeModal.style.display = 'none';
      this.activeModal = null;
    }
  }
  
  setupCloseHandlers(modal) {
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hide();
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
    
    // Close button
    const closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
  }
}

const modalManager = new ModalManager();
```

### 4.3 Database Schema (DynamoDB)

#### 4.3.1 Stories Table

**Table Name:** `aipm-backend-prod-stories`

**Primary Key:** `id` (Number)

**Attributes:**
```json
{
  "id": 1234567890123,
  "title": "Story Title",
  "description": "Detailed story description",
  "asA": "user role",
  "iWant": "desired functionality",
  "soThat": "business value",
  "status": "Draft|Ready|In Progress|Blocked|Approved|Done",
  "storyPoint": 5,
  "assigneeEmail": "user@example.com",
  "parentId": 1234567890122,
  "components": ["WorkModel", "UserInterface"],
  "acceptWarnings": false,
  "bypassDoneValidation": false,
  "createdAt": "2026-01-05T07:00:00.000Z",
  "updatedAt": "2026-01-05T07:30:00.000Z",
  "prs": [
    {
      "number": 123,
      "title": "PR Title",
      "url": "https://github.com/owner/repo/pull/123",
      "status": "open",
      "branchName": "feature-branch",
      "createdAt": "2026-01-05T07:15:00.000Z"
    }
  ],
  "investAnalysis": {
    "source": "heuristic|ai",
    "summary": "Analysis summary",
    "warnings": []
  }
}
```

**Indexes:**
- Primary: `id` (Number)
- GSI: `parentId-createdAt-index` (for hierarchical queries)

#### 4.3.2 Acceptance Tests Table

**Table Name:** `aipm-backend-prod-acceptance-tests`

**Primary Key:** `id` (String)

**Attributes:**
```json
{
  "id": "test-1234567890123",
  "storyId": 1234567890123,
  "title": "Test Title",
  "given": ["Given condition 1", "Given condition 2"],
  "when": ["When action 1", "When action 2"],
  "then": ["Then outcome 1", "Then outcome 2"],
  "status": "Draft|Pass|Fail|Blocked",
  "createdAt": "2026-01-05T07:00:00.000Z",
  "updatedAt": "2026-01-05T07:30:00.000Z"
}
```

**Indexes:**
- Primary: `id` (String)
- GSI: `storyId-createdAt-index` (for story-based queries)

#### 4.3.3 Data Relationships

**Story Hierarchy:**
```
Root Story (parentId: null)
├── Child Story 1 (parentId: root.id)
│   ├── Grandchild 1.1 (parentId: child1.id)
│   └── Grandchild 1.2 (parentId: child1.id)
└── Child Story 2 (parentId: root.id)
    └── Grandchild 2.1 (parentId: child2.id)
```

**Story-Test Relationship:**
```
Story (id: 123)
├── Acceptance Test 1 (storyId: 123)
├── Acceptance Test 2 (storyId: 123)
└── Acceptance Test 3 (storyId: 123)
```

**Story-PR Relationship:**
```
Story (id: 123)
├── PR #456 (Development)
├── PR #457 (Bug Fix)
└── PR #458 (Enhancement)
```

---

## 5. Development Workflows

### 5.1 Local Development

**Daily Development Workflow:**

1. **Start Development Environment:**
```bash
cd aipm
npm run dev
```

2. **Access Application:**
- Frontend: http://localhost:4000
- API: http://localhost:4000/api
- Health: http://localhost:4000/health

3. **Make Changes:**
- Edit files in `apps/frontend/public/` for frontend changes
- Edit files in `apps/backend/` for backend changes
- Changes are reflected immediately (no build step required)

4. **Test Changes:**
```bash
npm test
```

5. **Commit Changes:**
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

### 5.2 Testing Procedures

**Unit Tests:**
```bash
npm test
```

**Integration Tests:**
```bash
./scripts/testing/run-structured-gating-tests.sh
```

**Manual Testing Checklist:**
- [ ] Story creation and editing
- [ ] Mindmap visualization
- [ ] Outline tree navigation
- [ ] Acceptance test management
- [ ] GitHub integration
- [ ] Modal workflows
- [ ] Data persistence

### 5.3 Code Generation with Kiro CLI

**Current Implementation:**
The Kiro integration has evolved from a local worker to an API-based service running on the development environment.

**Kiro API Server:**
- **Location**: `scripts/kiro-api-server-v4.js`
- **Deployment**: Runs on development EC2 instance (44.222.168.46:8081)
- **Function**: Handles code generation requests via HTTP API

**Code Generation Workflow:**
1. User clicks "Generate Code & PR" in AIPM story details
2. Frontend sends request to backend `/api/create-pr` endpoint
3. Backend creates GitHub PR with TASK.md specification
4. Task added to DynamoDB queue (`aipm-amazon-q-queue`)
5. Kiro API server processes task and generates code
6. Code committed and pushed to PR branch
7. Developer reviews and merges PR

**Kiro Integration Points:**
- **Task Queue**: `aipm-amazon-q-queue` DynamoDB table
- **Code Generation**: Kiro CLI with browser authentication
- **PR Management**: GitHub API integration
- **Template System**: Uses `templates/code-generation.md` for workflow specification

**Current Status:**
- ✅ Kiro API server deployed and running
- ✅ GitHub PR creation integrated
- ✅ Task queue system operational
- ✅ Code generation templates defined

### 5.4 Pull Request Workflow

**Creating PRs:**
1. User clicks "Generate Code & PR" in story details
2. Backend creates branch from main
3. Backend creates PR with story details as description
4. PR appears in GitHub with "open" status

**PR Management:**
```javascript
// Create PR
const pr = await createGitHubPR({
  branchName: `feature-${storyId}-${timestamp}`,
  title: story.title,
  body: generatePRDescription(story),
  storyId: story.id
});

// Update story with PR info
await updateStory(story.id, {
  prs: [...story.prs, pr]
});
```

**Test in Dev Workflow:**
1. Click "Test in Dev" button on PR
2. Triggers GitHub Actions workflow
3. Rebases PR branch to latest main
4. Deploys to development environment
5. Runs post-deployment validation
6. Comments on PR with deployment status

### 5.5 Story Management Process

**Story Lifecycle:**
```
Draft → Ready → In Progress → Approved → Done
  ↓       ↓         ↓           ↓        ↓
Create  INVEST   Development  Review   Complete
Story   Check    Work        Process   Validation
```

**Status Transitions:**
- **Draft → Ready**: INVEST validation passes
- **Ready → In Progress**: Development starts
- **In Progress → Blocked**: Dependencies or issues
- **In Progress → Approved**: Code review complete
- **Approved → Done**: All acceptance tests pass

**INVEST Validation Process:**
1. User creates or edits story
2. System runs INVEST analysis (heuristic + AI)
3. Warnings displayed in UI
4. User can override warnings if needed
5. Story marked as Ready when validation passes

---
## 6. Deployment Guide

### 6.1 Deployment Architecture

AIPM uses a dual-environment deployment strategy:

**Production Environment:**
- Frontend: S3 static hosting (`aipm-static-hosting-demo`)
- Backend: EC2 instance (`44.220.45.57`)
- Database: DynamoDB production tables

**Development Environment:**
- Frontend: S3 static hosting (`aipm-dev-frontend-hosting`)
- Backend: EC2 instance (`44.222.168.46`)
- Database: DynamoDB development tables

### 6.2 Production Deployment

**Automated Deployment:**
```bash
./bin/deploy-prod
# or
./scripts/deploy-to-environment.sh prod
```

**Current Deployment Process:**
1. **Database Synchronization**: Copy production data to development (dev deployments only)
2. **Backend Deployment**: Deploy to EC2 instance via SSH
3. **Frontend Deployment**: Sync static files to S3 bucket
4. **Service Restart**: Restart systemd service (`aipm-backend.service`)
5. **Health Verification**: Validate deployment success
6. **Gating Tests**: Run post-deployment validation

**Manual Deployment Steps:**

1. **Deploy Backend:**
```bash
./scripts/deploy-to-environment.sh prod
```

2. **Verify Deployment:**
```bash
curl http://44.220.45.57/health
curl http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
```

3. **Run Gating Tests:**
```bash
./scripts/testing/run-structured-gating-tests.sh
```

### 6.3 Development Environment Deployment

**Deploy to Development:**
```bash
./scripts/deploy-to-environment.sh dev
```

**Test in Dev Workflow:**
1. Create PR in GitHub
2. Click "Test in Dev" button in AIPM UI
3. GitHub Actions workflow triggers
4. PR branch deployed to development environment
5. Validation tests run automatically

### 6.4 Unified Deployment Script

**Script Location:** `scripts/deploy-to-environment.sh`

**Usage:**
```bash
./scripts/deploy-to-environment.sh <env>
# env: prod | dev
```

**Features:**
- Environment-specific configuration
- Health checks and verification
- Data synchronization (dev only)
- Rollback on failure
- GitHub Actions compatibility

**Script Structure:**
```bash
#!/bin/bash
set -e

ENV=$1
if [[ "$ENV" == "prod" ]]; then
    HOST="44.220.45.57"
    FRONTEND_BUCKET="aipm-static-hosting-demo"
elif [[ "$ENV" == "dev" ]]; then
    HOST="44.222.168.46"
    FRONTEND_BUCKET="aipm-dev-frontend-hosting"
fi

# Deploy backend
if [[ -n "$GITHUB_ACTIONS" ]]; then
    echo "⚠️ GitHub Actions - skipping SSH deployment"
else
    scp apps/backend/app.js ec2-user@$HOST:aipm/apps/backend/app.js
    ssh ec2-user@$HOST "sudo systemctl restart aipm-backend"
fi

# Deploy frontend
aws s3 sync apps/frontend/public/ s3://$FRONTEND_BUCKET/

# Verify deployment
curl -s "$API_URL/health" | grep -q "running"
```

### 6.5 GitHub Actions CI/CD

**Workflows:**

1. **Deploy PR to Development** (`.github/workflows/deploy-pr-to-dev.yml`)
2. **Deploy to Production** (`.github/workflows/deploy-to-prod.yml`)

**PR Deployment Workflow:**
```yaml
name: Deploy PR to Development

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to deploy'
        required: false

jobs:
  gating-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout and rebase PR branch
      - name: Run gating tests
      
  deploy:
    needs: gating-tests
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to development environment
        run: ./scripts/deploy-to-environment.sh dev
      - name: Run post-deployment validation
```

**Production Deployment Workflow:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - name: Run gating tests
      - name: Deploy to production environment
        run: ./scripts/deploy-to-environment.sh prod
      - name: Verify deployment
```

### 6.6 Manual Deployment Procedures

**Emergency Deployment:**

1. **Quick Frontend Update:**
```bash
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --cache-control no-cache
```

2. **Backend Hotfix:**
```bash
scp apps/backend/app.js ec2-user@44.220.45.57:aipm/apps/backend/app.js
ssh ec2-user@44.220.45.57 "sudo systemctl restart aipm-backend"
```

3. **Database Migration:**
```bash
# Backup current data
aws dynamodb scan --table-name aipm-backend-prod-stories > backup.json

# Apply migration script
node scripts/migrate-database.js

# Verify migration
./scripts/testing/run-structured-gating-tests.sh
```

**Rollback Procedures:**

1. **Frontend Rollback:**
```bash
# Restore from previous S3 version
aws s3api list-object-versions --bucket aipm-static-hosting-demo
aws s3api get-object --bucket aipm-static-hosting-demo --key app.js --version-id <version-id> app.js
aws s3 cp app.js s3://aipm-static-hosting-demo/app.js
```

2. **Backend Rollback:**
```bash
# Restore from git
git checkout HEAD~1 -- apps/backend/app.js
scp apps/backend/app.js ec2-user@44.220.45.57:aipm/apps/backend/app.js
ssh ec2-user@44.220.45.57 "sudo systemctl restart aipm-backend"
```

---

## 7. Testing Framework

### 7.1 Gating Tests Overview

The AIPM testing framework uses structured gating tests organized into phases:

**Phase 1: Critical Security & Data Safety**
- Security validation tests
- Database integrity tests  
- Deployment safety tests

**Phase 2: Performance & API Safety**
- Performance validation tests
- API contract validation tests
- Resource limits tests

**Phase 3: Infrastructure & Monitoring**
- Network & infrastructure tests
- Monitoring & alerting tests
- Integration tests

**Phase 4: End-to-End Workflow Validation**
- Story management workflow tests
- GitHub integration tests
- User interface tests

### 7.2 Security Validation Tests

**GitHub Token Permissions:**
```bash
# Test GitHub token has required permissions
GITHUB_STATUS=$(curl -s "http://44.220.45.57/api/github-status" | jq -r '.hasValidToken')
if [[ "$GITHUB_STATUS" == "true" ]]; then
    pass_test "GitHub token has required permissions"
else
    fail_test "GitHub token lacks push permissions or is not configured"
fi
```

**AWS IAM Permissions:**
```bash
# Test DynamoDB access
if aws dynamodb describe-table --table-name aipm-backend-prod-stories >/dev/null 2>&1; then
    pass_test "AWS has DynamoDB access"
else
    fail_test "AWS lacks DynamoDB access"
fi

# Test S3 access
if aws s3 ls s3://aipm-deployments-728378229251/ >/dev/null 2>&1; then
    pass_test "AWS has S3 access"
else
    fail_test "AWS lacks S3 access"
fi
```

**Environment Variable Security:**
```bash
# Check for exposed secrets
EXPOSED_SECRETS=$(env | grep -i "token\|key\|secret" | grep -v "GITHUB_TOKEN" | grep -v "AWS_ACCESS_KEY_ID" | grep -v "AWS_SECRET_ACCESS_KEY" | wc -l)
if [[ "$EXPOSED_SECRETS" -eq 0 ]]; then
    pass_test "No exposed secrets in environment"
else
    fail_test "Potential secrets exposed: $EXPOSED_SECRETS variables"
fi
```

### 7.3 Performance Tests

**API Response Time Tests:**
```bash
# Test stories API performance
START_TIME=$(date +%s%N)
curl -s "http://44.220.45.57/api/stories" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [[ $RESPONSE_TIME -lt 2000 ]]; then
    pass_test "Stories API: ${RESPONSE_TIME}ms (< 2s)"
else
    fail_test "Stories API too slow: ${RESPONSE_TIME}ms (>= 2s)"
fi
```

**Concurrent Request Handling:**
```bash
# Test concurrent request handling
for i in {1..5}; do
    curl -s "http://44.220.45.57/api/stories" > /tmp/response_$i.json &
done
wait

# Check all responses are valid
VALID_RESPONSES=0
for i in {1..5}; do
    if jq -e '. | type == "array"' /tmp/response_$i.json >/dev/null 2>&1; then
        VALID_RESPONSES=$((VALID_RESPONSES + 1))
    fi
done

if [[ $VALID_RESPONSES -eq 5 ]]; then
    pass_test "Handled 5 concurrent requests successfully"
else
    fail_test "Failed concurrent request handling: $VALID_RESPONSES/5 valid"
fi
```

### 7.4 Infrastructure Tests

**Network Connectivity:**
```bash
# Test production frontend accessibility
if curl -s "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com" | grep -q "AI Project Manager"; then
    pass_test "Production frontend accessible"
else
    fail_test "Production frontend not accessible"
fi

# Test development frontend accessibility
if curl -s "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com" | grep -q "AI Project Manager"; then
    pass_test "Development frontend accessible"
else
    fail_test "Development frontend not accessible"
fi
```

**EC2 Instance Connectivity:**
```bash
# Test production EC2 instance
if curl -s --max-time 5 "http://44.220.45.57/health" >/dev/null 2>&1; then
    pass_test "Production EC2 instance reachable"
else
    fail_test "Production EC2 instance unreachable"
fi

# Test development EC2 instance
if curl -s --max-time 5 "http://44.222.168.46/health" >/dev/null 2>&1; then
    pass_test "Development EC2 instance reachable"
else
    fail_test "Development EC2 instance unreachable"
fi
```

### 7.5 End-to-End Workflow Tests

**Story Management Workflow:**
```bash
# Test story creation workflow
STORY_DATA='{"title":"Test Story","description":"Test Description","asA":"tester","iWant":"to test","soThat":"testing works"}'
RESPONSE=$(curl -s -X POST "http://44.220.45.57/api/stories" \
    -H "Content-Type: application/json" \
    -d "$STORY_DATA")

STORY_ID=$(echo "$RESPONSE" | jq -r '.id')
if [[ "$STORY_ID" != "null" && "$STORY_ID" != "" ]]; then
    pass_test "Story creation workflow successful (ID: $STORY_ID)"
    
    # Test story retrieval
    RETRIEVED_STORY=$(curl -s "http://44.220.45.57/api/stories/$STORY_ID")
    if echo "$RETRIEVED_STORY" | jq -e '.title == "Test Story"' >/dev/null; then
        pass_test "Story retrieval workflow successful"
    else
        fail_test "Story retrieval workflow failed"
    fi
    
    # Cleanup test data
    curl -s -X DELETE "http://44.220.45.57/api/stories/$STORY_ID" >/dev/null
else
    fail_test "Story creation workflow failed"
fi
```

### 7.6 Test Automation

**Running All Tests:**
```bash
./scripts/testing/run-structured-gating-tests.sh
```

**Test Results Format:**
```
🧪 AIPM Structured Gating Tests

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 PHASE 1: Critical Security & Data Safety
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 Security Validation Tests
  🧪 GitHub token permissions
    ✅ GitHub token has required permissions
  🧪 AWS IAM permissions
    ✅ AWS has DynamoDB access
    ✅ AWS has S3 access

📊 Phase 1 Results: ✅ 3 passed, ❌ 0 failed
🎉 Phase 1 completed successfully

🎉 ALL GATING TESTS PASSED!
✅ System approved for deployment
```

**Continuous Integration:**
Tests run automatically on:
- Every push to main branch
- Every pull request
- Manual deployment triggers
- Scheduled daily runs

---

## 8. Security & Compliance

### 8.1 GitHub Token Management

**Token Requirements:**
- Personal access token with `repo` permissions
- Token must have push access to repository
- Token should be rotated regularly (every 90 days)

**Token Validation:**
```javascript
// Backend endpoint: GET /api/github-status
app.get('/api/github-status', async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.json({ hasValidToken: false, error: 'Token not configured' });
    }

    const response = await fetch('https://api.github.com/repos/demian7575/aipm', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({ 
        hasValidToken: data.permissions?.push === true,
        permissions: data.permissions 
      });
    } else {
      res.json({ hasValidToken: false, error: 'API call failed' });
    }
  } catch (error) {
    res.json({ hasValidToken: false, error: error.message });
  }
});
```

**Token Security Best Practices:**
- Store tokens in environment variables, never in code
- Use GitHub Actions secrets for CI/CD
- Implement token rotation procedures
- Monitor token usage and permissions
- Revoke unused or compromised tokens immediately

### 8.2 AWS IAM Permissions

**Required IAM Permissions:**

**DynamoDB:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-prod-stories",
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-prod-acceptance-tests",
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-dev-stories",
        "arn:aws:dynamodb:us-east-1:*:table/aipm-backend-dev-acceptance-tests"
      ]
    }
  ]
}
```

**S3:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::aipm-static-hosting-demo/*",
        "arn:aws:s3:::aipm-dev-frontend-hosting/*",
        "arn:aws:s3:::aipm-deployments-728378229251/*"
      ]
    }
  ]
}
```

### 8.3 Environment Variable Security

**Secure Environment Variables:**
```bash
# Required secrets
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Application configuration (safe to expose)
AWS_REGION=us-east-1
STORIES_TABLE=aipm-backend-prod-stories
ACCEPTANCE_TESTS_TABLE=aipm-backend-prod-acceptance-tests
```

**Security Validation:**
```bash
# Check for exposed secrets in environment
EXPOSED_SECRETS=$(env | grep -i "token\|key\|secret" | \
  grep -v "GITHUB_TOKEN" | \
  grep -v "AWS_ACCESS_KEY_ID" | \
  grep -v "AWS_SECRET_ACCESS_KEY" | \
  wc -l)

if [[ "$EXPOSED_SECRETS" -eq 0 ]]; then
  echo "✅ No exposed secrets detected"
else
  echo "❌ Potential secrets exposed: $EXPOSED_SECRETS variables"
fi
```

### 8.4 Data Protection

**Data Encryption:**
- DynamoDB encryption at rest (AWS managed keys)
- HTTPS for all API communications
- S3 bucket encryption for static assets

**Data Backup:**
```bash
# Backup DynamoDB tables
aws dynamodb scan --table-name aipm-backend-prod-stories > stories-backup.json
aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests > tests-backup.json

# Backup S3 assets
aws s3 sync s3://aipm-static-hosting-demo/ ./frontend-backup/
```

**Data Retention:**
- User stories: Retained indefinitely
- Acceptance tests: Retained indefinitely  
- Application logs: 30 days
- Deployment artifacts: 90 days

### 8.5 Access Control

**Repository Access:**
- Repository owners: Full access
- Collaborators: Read/write access to code
- GitHub Actions: Automated deployment access

**AWS Resource Access:**
- Production environment: Restricted to authorized personnel
- Development environment: Broader access for testing
- IAM roles: Principle of least privilege

**API Access Control:**
```javascript
// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Rate limiting (basic implementation)
const rateLimiter = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000); // 1 minute window
  
  if (recentRequests.length >= 100) { // 100 requests per minute
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  return true;
}
```

---
