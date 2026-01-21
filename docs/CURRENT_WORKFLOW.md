# Current Workflow - AIPM Code Generation

## Overview

```
User clicks button → Backend creates PR → EC2 generates code → PR updated
                     (1.5 seconds)        (2-10 minutes async)
```

## Step-by-Step Flow

### 1. User Interface
```
apps/frontend/public/app.js:2062

User clicks "Generate Code & PR" button
    ↓
Modal opens with form:
    - Repository (owner/repo)
    - Branch name
    - Task title
    - Objective
    - PR title
    - Constraints
    - Acceptance criteria
```

### 2. Frontend Submission
```
apps/frontend/public/app.js:5353-5800

User submits form
    ↓
POST /api/personal-delegate
{
  owner: "ebaejun",
  repo: "tools",
  branchName: "feature/add-export",
  taskTitle: "Add export button",
  objective: "User can export data",
  prTitle: "feat: Add export button",
  constraints: "Use existing button patterns",
  acceptanceCriteria: ["Button appears", "Export works"]
}
```

### 3. Backend Processing
```
apps/backend/app.js:390-520

Step 1: Generate unique branch name
┌────────────────────────────────────────┐
│ const timestamp = Date.now();         │
│ branchName = "feature/add-export-     │
│               1733356800123"          │
└────────────────────────────────────────┘

Step 2: Create branch on GitHub
┌────────────────────────────────────────┐
│ - Get main branch SHA                 │
│ - Create new branch from main         │
└────────────────────────────────────────┘

Step 3: Create TASK.md file
┌────────────────────────────────────────┐
│ # Add export button                   │
│                                       │
│ Objective: User can export data       │
│ Constraints: Use existing patterns    │
│ Acceptance Criteria:                  │
│ - Button appears                      │
│ - Export works                        │
└────────────────────────────────────────┘

Step 4: Commit to branch
┌────────────────────────────────────────┐
│ git commit -m "feat: Add export button"│
└────────────────────────────────────────┘

Step 5: Create Pull Request
┌────────────────────────────────────────┐
│ PR #123                               │
│ Title: "feat: Add export button"      │
│ Branch: feature/add-export-...123     │
│ Base: main                            │
│ Body: Task description                │
└────────────────────────────────────────┘

Step 6: Trigger code generation (fire-and-forget)
┌────────────────────────────────────────┐
│ fetch('http://3.92.96.67:8080/      │
│       generate-code', {               │
│   branch: "feature/add-export-...123",│
│   taskDescription: "...",             │
│   prNumber: 123                       │
│ })                                    │
│ // No await - returns immediately!    │
└────────────────────────────────────────┘

Step 7: Return to frontend
┌────────────────────────────────────────┐
│ {                                     │
│   type: 'pull_request',               │
│   html_url: 'https://github.com/...',│
│   number: 123,                        │
│   branchName: 'feature/add-export-...'│
│   confirmationCode: 'PR1733356800123' │
│ }                                     │
└────────────────────────────────────────┘
```

### 4. Frontend Shows Success
```
apps/frontend/public/app.js:5800

✅ "CodeWhisperer task created. Confirmation: PR1733356800123"

User sees PR link immediately
Code generation happens in background
```

### 5. EC2 Code Generation (Async)
```
scripts/workers/terminal-server.js:300-400

POST /generate-code received
    ↓
Step 1: Get available worker
┌────────────────────────────────────────┐
│ Worker 1: BUSY                        │
│ Worker 2: IDLE ← Selected             │
└────────────────────────────────────────┘

Step 2: Checkout branch
┌────────────────────────────────────────┐
│ cd /home/ec2-user/aipm                │
│ git fetch origin                      │
│ git checkout feature/add-export-...123│
└────────────────────────────────────────┘

Step 3: Run Kiro CLI
┌────────────────────────────────────────┐
│ kiro-cli chat                         │
│                                       │
│ Prompt:                               │
│ "Implement: User can export data      │
│                                       │
│  Constraints: Use existing patterns   │
│                                       │
│  Acceptance Criteria:                 │
│  - Button appears                     │
│  - Export works"                      │
│                                       │
│ [Wait 30s - 10 minutes]               │
└────────────────────────────────────────┘

Step 4: Commit and push
┌────────────────────────────────────────┐
│ git add .                             │
│ git commit -m "feat: Add export button"│
│ git push origin feature/add-export-...│
└────────────────────────────────────────┘

Step 5: Worker becomes IDLE
┌────────────────────────────────────────┐
│ Worker 2: IDLE (ready for next task) │
└────────────────────────────────────────┘
```

### 6. GitHub PR Updated
```
PR #123 now contains:
✅ TASK.md (initial commit)
✅ Code changes (Kiro commit)
Status: Ready for review
```

## Parallel Processing (2 Users)

```
Time    User A                          User B
────────────────────────────────────────────────────────────
0:00    Click button                    Click button
0:01    Fill form                       Fill form
0:30    Submit                          Submit
        ↓                               ↓
0:31    Backend: PR #123 created        Backend: PR #124 created
        branch-...123                   branch-...456
        ↓                               ↓
0:32    ✅ Success shown                ✅ Success shown
        ↓                               ↓
0:33    EC2: Worker 1 assigned          EC2: Worker 2 assigned
0:34    Checkout branch-...123          Checkout branch-...456
0:35    Kiro starts                     Kiro starts
        ↓                               ↓
2:00    [Both generating code in parallel]
        ↓                               ↓
5:00    Commit & push ✅                Commit & push ✅
        Worker 1 IDLE                   Worker 2 IDLE
```

## Key Components

### Backend (Lambda)
- **File:** `apps/backend/app.js`
- **Endpoint:** `POST /api/personal-delegate`
- **Function:** Creates PR with unique branch name
- **Response time:** ~1.5 seconds

### Frontend (S3)
- **File:** `apps/frontend/public/app.js`
- **Function:** Modal form + API calls
- **User experience:** Immediate feedback

### EC2 Worker Pool
- **File:** `scripts/workers/terminal-server.js`
- **Port:** 8080
- **Workers:** 2 persistent Kiro CLI sessions
- **Function:** Generate code in parallel

### Health Monitor
- **Interval:** 60 seconds
- **Function:** Check worker health, restart if needed
- **Auto-recovery:** Workers restart on crash

## Data Flow

```
┌──────────┐    POST     ┌──────────┐   GitHub   ┌──────────┐
│ Frontend │ ─────────→  │ Backend  │ ─────────→ │  GitHub  │
│  (S3)    │             │ (Lambda) │   API      │   PR     │
└──────────┘             └──────────┘            └──────────┘
                              │
                              │ Fire-and-forget
                              ↓
                         ┌──────────┐
                         │   EC2    │
                         │  Worker  │
                         │   Pool   │
                         └──────────┘
                              │
                              │ git push
                              ↓
                         ┌──────────┐
                         │  GitHub  │
                         │   PR     │
                         │ (updated)│
                         └──────────┘
```

## Environment URLs

### Production
- **Frontend:** http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
- **Backend:** https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
- **EC2:** http://3.92.96.67:8080

### Development
- **Frontend:** http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
- **Backend:** https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
- **EC2:** http://3.92.96.67:8080

## Timing

```
Action                          Time        Cumulative
────────────────────────────────────────────────────────
User clicks button              0ms         0ms
Modal opens                     50ms        50ms
User fills form                 30s         30s
Submit to backend               100ms       30.1s
Backend creates branch          500ms       30.6s
Backend commits TASK.md         500ms       31.1s
Backend creates PR              500ms       31.6s
Backend triggers EC2            100ms       31.7s
Backend returns response        100ms       31.8s
✅ User sees success            50ms        31.85s

[Async - user doesn't wait]
EC2 receives request            200ms       32s
Worker assigned                 100ms       32.1s
Branch checked out              2s          34.1s
Kiro CLI starts                 5s          39.1s
Code generation                 30s-10min   1-10min
Commit & push                   5s          +5s
✅ PR updated with code         -           Done
```

## Success Criteria

✅ User gets immediate feedback (< 2 seconds)  
✅ PR created with unique branch name  
✅ Code generation happens async  
✅ Multiple users can work in parallel  
✅ Workers auto-recover from failures  
✅ Health monitoring prevents stuck workers  

## Current Status

**Production:** ✅ Live and working  
**Worker Pool:** ✅ 2 workers active  
**Health Monitor:** ✅ Running every 60s  
**Parallel Processing:** ✅ Supported  
**Auto-Recovery:** ✅ Enabled  
