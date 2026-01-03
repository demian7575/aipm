# AIPM System Workflow Diagrams

## 1. Overall System Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 AIPM System                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   Frontend      │    │  Main Backend   │    │ Kiro API Server │             │
│  │   (S3 Static)   │    │   (EC2:80)      │    │   (EC2:8081)    │             │
│  │                 │    │                 │    │                 │             │
│  │ • index.html    │◄──►│ • app.js        │◄──►│ • kiro-api-     │             │
│  │ • app.js        │    │ • server.js     │    │   server-v4.js  │             │
│  │ • config.js     │    │ • dynamodb.js   │    │ • Template      │             │
│  │                 │    │                 │    │   System        │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           │                       │                       │                     │
│           ▼                       ▼                       ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │    Browser      │    │   DynamoDB      │    │   Kiro CLI      │             │
│  │   (Client)      │    │   Tables        │    │  (Child Proc)   │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                   │                       │                     │
│                                   │                       │                     │
│                          ┌─────────────────┐    ┌─────────────────┐             │
│                          │  GitHub API     │    │  Template Files │             │
│                          │  (PR/Branch)    │    │  (*.md/*.json)  │             │
│                          └─────────────────┘    └─────────────────┘             │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                            GitHub Actions CI/CD                                │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ deploy-pr-to-   │    │ production-     │    │ gating-tests    │             │
│  │ dev.yml         │    │ deploy.yml      │    │ .yml            │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow Diagram - User Story Creation

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Fill story form
       │    Click "Create"
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/stories
       │    {title, description, ...}
       ▼
┌─────────────┐
│ Main Backend│
│   app.js    │
└──────┬──────┘
       │ 3. Validate data
       │    Generate ID
       ▼
┌─────────────┐
│  DynamoDB   │
│ Stories     │
│ Table       │
└──────┬──────┘
       │ 4. Store story
       │    Return story object
       ▼
┌─────────────┐
│ Main Backend│
│   app.js    │
└──────┬──────┘
       │ 5. HTTP 201 Created
       │    {id, title, ...}
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 6. Update UI
       │    - Refresh outline
       │    - Update mindmap
       │    - Show details
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (Updated)   │
└─────────────┘
```

## 3. Code Generation Workflow

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Click "Generate Code"
       │    Enter PR number
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/generate-code-branch
       │    {storyId, prNumber, prompt}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
│ (Port 8081) │
└──────┬──────┘
       │ 3. Queue request
       │    Spawn Kiro CLI
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 4. Read template
       │    ./templates/code-generation.md
       ▼
┌─────────────┐
│ Template    │
│ System      │
└──────┬──────┘
       │ 5. Process instructions
       │    Generate code
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 6. Write files
       │    git add/commit/push
       ▼
┌─────────────┐
│  GitHub     │
│  Repository │
└──────┬──────┘
       │ 7. Update PR branch
       │    Trigger Actions
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 8. Detect completion
       │    Return success
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 9. Show success
       │    Update PR status
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (Updated)   │
└─────────────┘
```

## 4. PR Deployment Workflow (GitHub Actions)

```
┌─────────────┐
│  Developer  │
│ Creates PR  │
└──────┬──────┘
       │ 1. git push origin feature-branch
       │    Open PR on GitHub
       ▼
┌─────────────┐
│  GitHub     │
│  Webhook    │
└──────┬──────┘
       │ 2. Trigger: pull_request
       │    [opened, synchronize, reopened]
       ▼
┌─────────────┐
│ GitHub      │
│ Actions     │
│ Runner      │
└──────┬──────┘
       │ 3. deploy-pr-to-dev.yml
       │    Checkout repository
       ▼
┌─────────────┐
│ Git         │
│ Operations  │
└──────┬──────┘
       │ 4. Fetch PR branch
       │    Rebase onto main
       │    Handle conflicts
       ▼
┌─────────────┐
│ Backend     │
│ Deployment  │
└──────┬──────┘
       │ 5. Upload to S3
       │    POST /api/deploy-backend
       ▼
┌─────────────┐
│ Development │
│ EC2 Server  │
└──────┬──────┘
       │ 6. Download from S3
       │    Restart services
       ▼
┌─────────────┐
│ Frontend    │
│ Deployment  │
└──────┬──────┘
       │ 7. aws s3 cp to dev bucket
       │    Update static files
       ▼
┌─────────────┐
│ Data Sync   │
└──────┬──────┘
       │ 8. POST /api/sync-data
       │    Mirror prod → dev
       ▼
┌─────────────┐
│ Health      │
│ Checks      │
└──────┬──────┘
       │ 9. Verify deployment
       │    Test endpoints
       ▼
┌─────────────┐
│  GitHub     │
│  PR Status  │
│ (Updated)   │
└─────────────┘
```

## 5. Data Synchronization Flow

```
┌─────────────┐
│ GitHub      │
│ Actions     │
└──────┬──────┘
       │ 1. POST /api/sync-data
       │    (Development EC2)
       ▼
┌─────────────┐
│ Main Backend│
│ (Dev Server)│
└──────┬──────┘
       │ 2. Initialize DynamoDB clients
       │    Production & Development
       ▼
┌─────────────┐
│ Production  │
│ DynamoDB    │
│ Tables      │
└──────┬──────┘
       │ 3. Scan all items
       │    Paginated results
       ▼
┌─────────────┐
│ Main Backend│
│ (Dev Server)│
└──────┬──────┘
       │ 4. Collect all prod data
       │    Process in batches
       ▼
┌─────────────┐
│Development  │
│ DynamoDB    │
│ Tables      │
└──────┬──────┘
       │ 5. BatchWrite DELETE
       │    Clear existing data
       ▼
┌─────────────┐
│ Main Backend│
│ (Dev Server)│
└──────┬──────┘
       │ 6. Process prod data
       │    Batch size: 25 items
       ▼
┌─────────────┐
│Development  │
│ DynamoDB    │
│ Tables      │
└──────┬──────┘
       │ 7. BatchWrite PUT
       │    Import prod data
       ▼
┌─────────────┐
│ Main Backend│
│ (Dev Server)│
└──────┬──────┘
       │ 8. Return sync status
       │    {exported: N, deleted: M, imported: N}
       ▼
┌─────────────┐
│ GitHub      │
│ Actions     │
│ (Complete)  │
└─────────────┘
```

## 6. Service Communication Matrix

```
┌─────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│                 │  Frontend   │ Main Backend│ Kiro API    │  DynamoDB   │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  Frontend       │      -      │ HTTP REST   │ HTTP REST   │      -      │
│                 │             │ (Port 80)   │ (Port 8081) │             │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Main Backend    │ HTTP REST   │      -      │      -      │ AWS SDK     │
│                 │ (CORS)      │             │             │ (DocClient) │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Kiro API Server │ HTTP REST   │      -      │      -      │ AWS SDK     │
│                 │ (CORS)      │             │             │ (DocClient) │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  DynamoDB       │      -      │ AWS SDK     │ AWS SDK     │      -      │
│                 │             │ (DocClient) │ (DocClient) │             │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  GitHub API     │ Direct      │ HTTP REST   │ HTTP REST   │      -      │
│                 │ (CORS)      │ (PAT Auth)  │ (PAT Auth)  │             │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  Kiro CLI       │      -      │      -      │ Child Proc  │      -      │
│                 │             │             │ (PTY)       │             │
└─────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

## 7. Error Handling Flow

```
┌─────────────┐
│   Error     │
│  Occurs     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Component   │
│ Detection   │
└──────┬──────┘
       │
       ├─ Frontend Error ──────────┐
       │                          ▼
       │                 ┌─────────────┐
       │                 │ Console Log │
       │                 │ Toast UI    │
       │                 │ Fallback    │
       │                 └─────────────┘
       │
       ├─ Backend Error ───────────┐
       │                          ▼
       │                 ┌─────────────┐
       │                 │ HTTP Status │
       │                 │ JSON Error  │
       │                 │ Server Log  │
       │                 └─────────────┘
       │
       ├─ DynamoDB Error ──────────┐
       │                          ▼
       │                 ┌─────────────┐
       │                 │ AWS SDK     │
       │                 │ Exception   │
       │                 │ Retry Logic │
       │                 └─────────────┘
       │
       └─ Kiro CLI Error ─────────┐
                                 ▼
                        ┌─────────────┐
                        │ Process     │
                        │ Exit Code   │
                        │ Output Log  │
                        └─────────────┘
```

## 8. Deployment State Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Local    │    │   GitHub    │    │    AWS      │
│ Development │    │ Repository  │    │ Production  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. git push      │                  │
       ├─────────────────►│                  │
       │                  │                  │
       │                  │ 2. GitHub Actions│
       │                  ├─────────────────►│
       │                  │                  │
       │                  │                  │ 3. Deploy
       │                  │                  │    - EC2 Update
       │                  │                  │    - S3 Upload
       │                  │                  │    - DynamoDB
       │                  │                  │
       │                  │ 4. Status Update │
       │                  │◄─────────────────┤
       │                  │                  │
       │ 5. PR Status     │                  │
       │◄─────────────────┤                  │
       │                  │                  │
       │                  │                  │
┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
│ Development │    │   Staging   │    │ Production  │
│ Environment │    │ Environment │    │ Environment │
│             │    │             │    │             │
│ • Local     │    │ • PR Branch │    │ • Main      │
│ • Feature   │    │ • Auto      │    │ • Manual    │
│   Branch    │    │   Deploy    │    │   Deploy    │
└─────────────┘    └─────────────┘    └─────────────┘
```

This comprehensive workflow analysis shows the complete system interactions based on systematic code reading rather than pattern searching.
