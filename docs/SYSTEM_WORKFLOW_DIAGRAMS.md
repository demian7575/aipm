# AIPM System Workflow Diagrams

## 1. Overall System Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 AIPM System                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                           ┌─────────────────┐             │
│  │   Frontend      │                           │ Kiro API Server │             │
│  │   (S3 Static)   │                           │   (EC2:8081)    │             │
│  │                 │                           │                 │             │
│  │ • index.html    │◄─────────────────────────►│ • kiro-api-     │             │
│  │ • app.js        │   HTTP API Calls          │   server-v4.js  │             │
│  │ • styles.css    │   (Port 80 → NGINX)       │ • Template      │             │
│  │ • mindmap.js    │                           │   System        │             │
│  └─────────────────┘                           └─────────────────┘             │
│           │                                              │                     │
│           │                                              │                     │
│           ▼                                              ▼                     │
│  ┌─────────────────┐                           ┌─────────────────┐             │
│  │    Browser      │                           │   Kiro CLI      │             │
│  │   (Client)      │                           │  (Child Proc)   │             │
│  └─────────────────┘                           │  --trust-all-   │             │
│                                                 │   tools         │             │
│                                                 └─────────────────┘             │
│                                                          │                     │
│                                                          │                     │
│                          ┌─────────────────┐    ┌─────────────────┐             │
│                          │   DynamoDB      │    │  Template Files │             │
│                          │   Tables:       │    │  ./templates/   │             │
│                          │   - stories     │    │  - *.md         │             │
│                          │   - tests       │    └─────────────────┘             │
│                          │   - queue       │                                   │
│                          └─────────────────┘                                   │
│                                   │                                            │
│                          ┌─────────────────┐                                   │
│                          │  GitHub API     │                                   │
│                          │  (PR/Branch)    │                                   │
│                          │  Octokit        │                                   │
│                          └─────────────────┘                                   │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                            GitHub Actions CI/CD                                │
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ deploy-pr-to-   │  Triggered by: workflow_dispatch (manual)                 │
│  │ dev.yml         │  Deploys to: aipm-dev-frontend-hosting (S3)               │
│  └─────────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow Diagram - User Story Creation (Template-Based)

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Click "Generate Story"
       │    Enter feature description
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/generate-draft
       │    {feature_description, parentId}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
│ (EC2:8081)  │
└──────┬──────┘
       │ 3. Build prompt with template reference
       │    sendToKiro("Read template: user-story-generation.md...")
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 4. Read template file
       │    ./templates/user-story-generation.md
       ▼
┌─────────────┐
│ Template    │
│ System      │
└──────┬──────┘
       │ 5. Execute AI reasoning
       │    Query DynamoDB for context
       │    Generate story JSON
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 6. POST /api/draft-response
       │    {draft: {title, asA, iWant, soThat, ...}}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 7. Store in global.latestDraft
       │    PutCommand to DynamoDB (story)
       │    PutCommand to DynamoDB (tests)
       ▼
┌─────────────┐
│  DynamoDB   │
│ Stories     │
│ Table       │
└──────┬──────┘
       │ 8. Return story ID
       │    {success: true, storyId: 123}
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 9. Refresh story list
       │    Update outline & mindmap
       │    Select new story
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (Updated)   │
└─────────────┘
```

## 3. Code Generation Workflow (Queue-Based)

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Click "Generate Code & PR"
       │    Select story
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/create-pr
       │    {storyId: 123}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
│ (EC2:8081)  │
└──────┬──────┘
       │ 3. Create branch on GitHub
       │    Create TASK.md file
       │    Create PR
       ▼
┌─────────────┐
│  GitHub     │
│  API        │
└──────┬──────┘
       │ 4. Branch created
       │    PR #1025 created
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 5. PutCommand to queue table
       │    {taskId, storyId, prNumber, status: 'pending'}
       ▼
┌─────────────┐
│  DynamoDB   │
│ Queue Table │
└──────┬──────┘
       │ 6. Task queued
       │    Return PR info
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 7. Show "PR created"
       │    Display PR link
       ▼
┌─────────────┐
│ Kiro Worker │
│ (Local)     │
└──────┬──────┘
       │ 8. Poll queue (every 1s)
       │    QueryCommand for pending tasks
       ▼
┌─────────────┐
│  DynamoDB   │
│ Queue Table │
└──────┬──────┘
       │ 9. Return pending task
       │    {taskId, storyId, prNumber}
       ▼
┌─────────────┐
│ Kiro Worker │
│ (Local)     │
└──────┬──────┘
       │ 10. git checkout PR branch
       │     kiro-cli chat (read template)
       ▼
┌─────────────┐
│  Kiro CLI   │
│ (Worker)    │
└──────┬──────┘
       │ 11. Read code-generation.md
       │     Read TASK.md
       │     Generate code files
       ▼
┌─────────────┐
│ Kiro Worker │
│ (Local)     │
└──────┬──────┘
       │ 12. git add/commit/push
       │     Update task status
       ▼
┌─────────────┐
│  GitHub     │
│  Repository │
└──────┬──────┘
       │ 13. PR branch updated
       │     Code committed
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (Review PR) │
└─────────────┘
```

## 4. PR Deployment Workflow (GitHub Actions)

```
┌─────────────┐
│  Developer  │
│ Reviews PR  │
└──────┬──────┘
       │ 1. Click "Deploy to Dev"
       │    in AIPM UI
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/trigger-deployment
       │    {prNumber: 1025}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 3. Trigger GitHub Actions workflow
       │    workflow_dispatch event
       ▼
┌─────────────┐
│ GitHub      │
│ Actions     │
│ Runner      │
└──────┬──────┘
       │ 4. deploy-pr-to-dev.yml
       │    Checkout PR branch
       ▼
┌─────────────┐
│ Git         │
│ Operations  │
└──────┬──────┘
       │ 5. Fetch PR branch
       │    Build frontend
       ▼
┌─────────────┐
│ Frontend    │
│ Build       │
└──────┬──────┘
       │ 6. aws s3 sync to dev bucket
       │    aipm-dev-frontend-hosting
       ▼
┌─────────────┐
│ Development │
│ S3 Bucket   │
└──────┬──────┘
       │ 7. Static files updated
       │    http://aipm-dev-frontend-hosting.s3-website...
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 8. Show success toast
       │    "Deployment triggered"
       ▼
┌─────────────┐
│  Developer  │
│ Tests on Dev│
└─────────────┘
```

## 5. INVEST Analysis Flow (Template-Based)

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Edit story fields
       │    (asA, iWant, soThat)
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/analyze-invest
       │    {storyId, asA, iWant, soThat}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 3. Build prompt with template
       │    sendToKiro("Read template: invest-analysis.md...")
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 4. Read invest-analysis.md
       │    QueryCommand (get acceptance tests)
       ▼
┌─────────────┐
│  DynamoDB   │
│ Tests Table │
└──────┬──────┘
       │ 5. Return tests for story
       │    [{given, when, then, status}]
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 6. Analyze INVEST criteria
       │    - Independent?
       │    - Negotiable?
       │    - Valuable?
       │    - Estimable?
       │    - Small?
       │    - Testable?
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 7. POST /api/invest-response
       │    {warnings: [...], summary: "..."}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 8. Store in global.latestInvestResult
       │    UpdateCommand (save to story.investAnalysis)
       ▼
┌─────────────┐
│  DynamoDB   │
│ Stories     │
│ Table       │
└──────┬──────┘
       │ 9. Story updated with analysis
       │    Return warnings to frontend
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 10. Display warnings in UI
       │     ⚠ Independent: Story depends on...
       │     ⚠ Testable: No acceptance tests
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (See Issues)│
└─────────────┘
```

## 6. Acceptance Test Draft Flow (Template-Based)

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Click "Create Acceptance Test"
       │    Click "Generate Draft"
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 2. POST /api/stories/:id/tests/draft
       │    {idea: "test login with valid credentials"}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 3. Build prompt with template
       │    sendToKiro("Read template: acceptance-test-generation.md...")
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 4. Read acceptance-test-generation.md
       │    GetCommand (fetch story details)
       ▼
┌─────────────┐
│  DynamoDB   │
│ Stories     │
│ Table       │
└──────┬──────┘
       │ 5. Return story context
       │    {title, asA, iWant, soThat}
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 6. Generate GWT steps
       │    Given: [preconditions]
       │    When: [actions]
       │    Then: [outcomes]
       ▼
┌─────────────┐
│  Kiro CLI   │
│ Child Proc  │
└──────┬──────┘
       │ 7. POST /api/draft-response
       │    {draft: {given: [...], when: [...], then: [...]}}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 8. Store in global.latestDraft
       │    Return draft to frontend
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 9. Populate form fields
       │    Given: [steps]
       │    When: [steps]
       │    Then: [steps]
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (Review &   │
│  Edit)      │
└──────┬──────┘
       │ 10. Click "Create Test"
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 11. POST /api/stories/:id/tests
       │     {given, when, then, status}
       ▼
┌─────────────┐
│ Kiro API    │
│ Server      │
└──────┬──────┘
       │ 12. PutCommand to tests table
       │     Generate test ID
       ▼
┌─────────────┐
│  DynamoDB   │
│ Tests Table │
└──────┬──────┘
       │ 13. Test created
       │     Return test object
       ▼
┌─────────────┐
│  Frontend   │
│   app.js    │
└──────┬──────┘
       │ 14. Refresh story details
       │     Show new test in list
       ▼
┌─────────────┐
│   User      │
│  Browser    │
│ (Updated)   │
└─────────────┘
```

## 7. Service Communication Matrix (Corrected)

```
┌─────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│                 │  Frontend   │ Kiro API    │  Kiro CLI   │  DynamoDB   │
│                 │  (S3)       │  (EC2:8081) │  (Process)  │  (AWS)      │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  Frontend       │      -      │ HTTP REST   │      -      │      -      │
│  (S3)           │             │ via NGINX   │             │             │
│                 │             │ Port 80     │             │             │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Kiro API Server │ HTTP REST   │      -      │ stdin/      │ AWS SDK     │
│ (EC2:8081)      │ (CORS)      │             │ stdout      │ (DocClient) │
│                 │             │             │ (IPC)       │             │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  Kiro CLI       │      -      │ HTTP POST   │      -      │ AWS CLI     │
│  (Process)      │             │ (callbacks) │             │ (via tools) │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  DynamoDB       │      -      │ AWS SDK     │ AWS CLI     │      -      │
│  (AWS)          │             │ (DocClient) │ (tools)     │             │
├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│  GitHub API     │      -      │ Octokit     │ git CLI     │      -      │
│                 │             │ (REST)      │ (tools)     │             │
└─────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

## 8. Error Handling Flow

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
