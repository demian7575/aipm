# PR Generation Workflow - Visual Diagram

## Complete Flow: User → PR → Code Generation

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 1. Click "Generate Code & PR"
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MODAL FORM (Frontend)                            │
│  - Repository, Owner, Branch                                        │
│  - Task Title, Objective, PR Title                                  │
│  - Constraints, Acceptance Criteria                                 │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 2. Submit Form
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              POST /api/personal-delegate (Backend)                  │
│                                                                     │
│  Step 1: Generate Unique Branch Name                               │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ timestamp = Date.now()                                 │        │
│  │ branchName = "feature/add-export-1733356800123"        │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Step 2: Create Branch on GitHub                                   │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ - Get main branch SHA                                  │        │
│  │ - Create new branch from main                          │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Step 3: Create TASK.md File                                       │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ # Task Title                                           │        │
│  │ Objective: ...                                         │        │
│  │ Constraints: ...                                       │        │
│  │ Acceptance Criteria: ...                               │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Step 4: Commit TASK.md to Branch                                  │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ git commit -m "feat: Task Title"                       │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Step 5: Create Pull Request                                       │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ PR #123: "Task Title"                                  │        │
│  │ Branch: feature/add-export-1733356800123               │        │
│  │ Base: main                                             │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Step 6: Fire-and-Forget Code Generation                           │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ fetch(EC2_URL/generate-code) // No await!             │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Step 7: Return PR Info to Frontend                                │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ { prUrl, number, branchName, confirmationCode }        │        │
│  └────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 3. PR Created (immediate response)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND SHOWS SUCCESS                           │
│  "CodeWhisperer task created. Confirmation: PR1733356800123"       │
└─────────────────────────────────────────────────────────────────────┘

                    ┌────────────────────────────────┐
                    │  PARALLEL ASYNC PROCESS        │
                    │  (Fire-and-Forget)             │
                    └────────────────────────────────┘
                                 │
                                 │ 4. Code generation request
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              EC2 Terminal Server (Port 8080)                        │
│                                                                     │
│  POST /generate-code                                                │
│  { branch, taskDescription, prNumber }                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         Worker Pool Manager                          │          │
│  │                                                      │          │
│  │  ┌──────────────┐      ┌──────────────┐            │          │
│  │  │  Worker 1    │      │  Worker 2    │            │          │
│  │  │  (Kiro CLI)  │      │  (Kiro CLI)  │            │          │
│  │  │              │      │              │            │          │
│  │  │  Status:     │      │  Status:     │            │          │
│  │  │  BUSY        │      │  IDLE        │            │          │
│  │  └──────────────┘      └──────────────┘            │          │
│  │                                                      │          │
│  │  Round-robin selection → Assign to Worker 2         │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
│  Worker 2 Processing:                                               │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ 1. git checkout feature/add-export-1733356800123       │        │
│  │ 2. kiro-cli chat "Implement task..."                   │        │
│  │ 3. Wait for code generation (max 10 min)               │        │
│  │ 4. git add . && git commit && git push                 │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Health Monitor (runs every 60s):                                   │
│  ┌────────────────────────────────────────────────────────┐        │
│  │ - Check worker idle time                               │        │
│  │ - Restart workers idle > 5 min                         │        │
│  │ - Log worker status                                    │        │
│  └────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 5. Code pushed to branch
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GITHUB PR                                   │
│  PR #123: feature/add-export-1733356800123                          │
│  ✅ TASK.md (initial commit)                                        │
│  ✅ Code changes (Kiro commit)                                      │
│  Status: Ready for review                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Simultaneous PR Creation (2 Users)

```
User A                          User B
  │                               │
  │ Click "Generate Code & PR"    │ Click "Generate Code & PR"
  ▼                               ▼
┌─────────────────┐         ┌─────────────────┐
│ Submit Form     │         │ Submit Form     │
│ branch: "feat"  │         │ branch: "feat"  │
└─────────────────┘         └─────────────────┘
  │                               │
  │ POST /api/personal-delegate   │ POST /api/personal-delegate
  ▼                               ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Parallel Processing)              │
│                                                         │
│  Request A:                    Request B:               │
│  timestamp = 1733356800123     timestamp = 1733356800456│
│  branch = "feat-1733356800123" branch = "feat-1733356800456"
│  ✅ Create branch              ✅ Create branch         │
│  ✅ Create PR #123             ✅ Create PR #124        │
│  ✅ Trigger EC2                ✅ Trigger EC2           │
└─────────────────────────────────────────────────────────┘
  │                               │
  │ PR #123 created               │ PR #124 created
  ▼                               ▼
┌─────────────────┐         ┌─────────────────┐
│ User A sees     │         │ User B sees     │
│ success message │         │ success message │
└─────────────────┘         └─────────────────┘

        ┌───────────────────────────────┐
        │  EC2 Worker Pool              │
        │                               │
        │  Worker 1 → PR #123 (BUSY)    │
        │  Worker 2 → PR #124 (BUSY)    │
        │                               │
        │  Both process in parallel ✅  │
        └───────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │  GitHub                       │
        │  PR #123 ✅ Code pushed       │
        │  PR #124 ✅ Code pushed       │
        └───────────────────────────────┘
```

## Key Features Preventing Conflicts

### 1. Unique Branch Names (Timestamp)
```javascript
// apps/backend/app.js:391-394
const timestamp = Date.now();
const branchName = `${normalized.branchName}-${timestamp}`;

// Result:
// User A: feat-1733356800123
// User B: feat-1733356800456
// No conflict! ✅
```

### 2. Worker Pool (Parallel Processing)
```javascript
// scripts/workers/terminal-server.js
const workers = {
  worker1: { pty, busy: false, ... },
  worker2: { pty, busy: false, ... }
};

// Round-robin assignment:
// Request A → Worker 1
// Request B → Worker 2
// Both process simultaneously ✅
```

### 3. Fire-and-Forget (Non-Blocking)
```javascript
// apps/backend/app.js:495
fetch(`${ec2Url}/generate-code`, {...})
  .then(...)  // No await!
  .catch(...);

// Backend returns immediately
// Code generation happens async ✅
```

## Timing Breakdown

```
User clicks button
    ↓
    0ms: Frontend opens modal
    ↓
    User fills form (~30 seconds)
    ↓
    0ms: POST /api/personal-delegate
    ↓
    500ms: Branch created on GitHub
    ↓
    1000ms: TASK.md committed
    ↓
    1500ms: PR created
    ↓
    1600ms: EC2 request sent (fire-and-forget)
    ↓
    1600ms: ✅ Frontend shows success
    
    ┌─────────────────────────────────┐
    │  Async (user doesn't wait)      │
    ├─────────────────────────────────┤
    │  2000ms: EC2 receives request   │
    │  2100ms: Worker assigned        │
    │  2200ms: Branch checked out     │
    │  2300ms: Kiro CLI starts        │
    │  30s-10min: Code generation     │
    │  +5s: Commit & push             │
    │  ✅ PR updated with code        │
    └─────────────────────────────────┘
```

## Error Handling

### Scenario 1: Both Workers Busy
```
Request A → Worker 1 (BUSY)
Request B → Worker 2 (BUSY)
Request C → ❌ 503 Service Unavailable
            "All workers busy, try again"
```

### Scenario 2: Worker Timeout
```
Worker 1 processing PR #123
    ↓
    120 seconds pass (timeout)
    ↓
    Worker 1 marked IDLE
    ❌ Error returned to backend
    PR #123 remains with only TASK.md
```

### Scenario 3: Worker Crash
```
Worker 1 exits unexpectedly
    ↓
    5 seconds delay
    ↓
    Worker 1 auto-restarts ✅
    Ready for new requests
```

## Summary

✅ **Unique branch names** prevent GitHub conflicts  
✅ **Worker pool** enables parallel processing  
✅ **Fire-and-forget** provides immediate user feedback  
✅ **Auto-recovery** handles worker failures  
✅ **Health monitoring** prevents stuck workers  

**Result:** Multiple users can create PRs simultaneously without any conflicts or race conditions.
