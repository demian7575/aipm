# Single PR Workflow - AIPM to EC2 Worker

## Core Concept

**AIPM generates ONE PR → Assigns to ONE EC2 worker**

```
┌──────────────────────────────────────────────────────────────┐
│                    AIPM Backend (Lambda)                     │
│                                                              │
│  User Request                                                │
│      ↓                                                       │
│  Generate 1 PR                                               │
│      ↓                                                       │
│  PR #123 created on GitHub                                   │
│      ↓                                                       │
│  Send to EC2: "Process PR #123"                              │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ POST /generate-code
                         │ { branch, taskDescription, prNumber }
                         ↓
┌──────────────────────────────────────────────────────────────┐
│              EC2 Worker Pool (Terminal Server)               │
│                                                              │
│  ┌────────────────┐              ┌────────────────┐         │
│  │   Worker 1     │              │   Worker 2     │         │
│  │   (Kiro CLI)   │              │   (Kiro CLI)   │         │
│  │                │              │                │         │
│  │   IDLE         │              │   BUSY         │         │
│  └────────────────┘              └────────────────┘         │
│         ↑                                                    │
│         │ Assigned (round-robin)                            │
│         │                                                    │
│  Worker 1 processes PR #123                                  │
└──────────────────────────────────────────────────────────────┘
```

## Detailed Flow

### 1. User Creates Single PR Request

```
User Interface
    ↓
    Clicks "Generate Code & PR"
    ↓
    Fills form for ONE task
    ↓
    Submits
```

### 2. AIPM Backend Creates ONE PR

```javascript
// apps/backend/app.js:390-520

Step 1: Create unique branch
┌─────────────────────────────────────┐
│ branchName = "feature-1733356800123"│
└─────────────────────────────────────┘

Step 2: Create ONE Pull Request
┌─────────────────────────────────────┐
│ PR #123                             │
│ Branch: feature-1733356800123       │
│ Status: Open                        │
│ Files: TASK.md only                 │
└─────────────────────────────────────┘

Step 3: Send to EC2 (ONE request)
┌─────────────────────────────────────┐
│ POST http://3.92.96.67:8080/      │
│      generate-code                  │
│                                     │
│ {                                   │
│   branch: "feature-1733356800123",  │
│   taskDescription: "...",           │
│   prNumber: 123                     │
│ }                                   │
└─────────────────────────────────────┘
```

### 3. EC2 Assigns to ONE Worker

```javascript
// scripts/workers/terminal-server.js:54-66

function getAvailableWorker() {
  // Round-robin selection
  const next = lastWorker === 'worker1' ? 'worker2' : 'worker1';
  
  if (!workers[next].busy) return next;      // Try next
  if (!workers[other].busy) return other;    // Try other
  
  return null; // Both busy
}

// Result: ONE worker assigned
```

### 4. ONE Worker Processes PR

```
EC2 Terminal Server
    ↓
Worker Selection:
┌─────────────────────────────────────┐
│ Worker 1: IDLE     ← Selected ✅    │
│ Worker 2: BUSY                      │
└─────────────────────────────────────┘
    ↓
Worker 1 Processing:
┌─────────────────────────────────────┐
│ 1. Checkout branch-1733356800123    │
│ 2. Run Kiro CLI                     │
│ 3. Generate code                    │
│ 4. Commit changes                   │
│ 5. Push to PR #123                  │
└─────────────────────────────────────┘
    ↓
Worker 1 Status:
┌─────────────────────────────────────┐
│ Worker 1: IDLE (done)               │
│ Worker 2: BUSY (still working)      │
└─────────────────────────────────────┘
```

## Multiple Users Scenario

When multiple users create PRs, each PR is assigned to one worker:

```
Time    User A                          User B
────────────────────────────────────────────────────────────
0:00    Creates PR #123                 -
        ↓
0:01    EC2: Worker 1 assigned          -
        Worker 1: BUSY (PR #123)
        Worker 2: IDLE
        
1:00    Worker 1: BUSY (PR #123)        Creates PR #124
                                        ↓
1:01    Worker 1: BUSY (PR #123)        EC2: Worker 2 assigned
        Worker 2: BUSY (PR #124)        
        
5:00    Worker 1: IDLE ✅ (PR #123 done)
        Worker 2: BUSY (PR #124)
        
6:00    Worker 1: IDLE
        Worker 2: IDLE ✅ (PR #124 done)
```

**Key Point:** Each PR is processed by exactly ONE worker.

## Assignment Logic

```javascript
// scripts/workers/terminal-server.js:54-66

Request arrives for PR #123
    ↓
Check Worker 1: IDLE? → YES → Assign to Worker 1 ✅
    ↓
Worker 1 marked BUSY
    ↓
Worker 1 processes PR #123
    ↓
Worker 1 marked IDLE (ready for next PR)
```

## Visual: One PR → One Worker

```
┌─────────────┐
│   PR #123   │
│   (GitHub)  │
└─────────────┘
       │
       │ Assignment
       ↓
┌─────────────┐
│  Worker 1   │  ← ONE worker
│  (EC2)      │
└─────────────┘
       │
       │ Code generation
       ↓
┌─────────────┐
│   PR #123   │
│  (Updated)  │
└─────────────┘
```

## Code References

### Backend: Creates ONE PR
```javascript
// apps/backend/app.js:390-520

// Create ONE branch
const branchName = `${normalized.branchName}-${timestamp}`;

// Create ONE PR
const pr = await githubRequest(`${repoPath}/pulls`, {
  method: 'POST',
  body: JSON.stringify({
    title: normalized.prTitle,
    head: branchName,
    base: baseBranch,
    body: ...
  })
});

// Send ONE request to EC2
fetch(`${ec2Url}/generate-code`, {
  method: 'POST',
  body: JSON.stringify({
    branch: branchName,        // ONE branch
    taskDescription,
    prNumber: pr.number        // ONE PR number
  })
});
```

### EC2: Assigns to ONE Worker
```javascript
// scripts/workers/terminal-server.js:300-400

// Receive ONE request
POST /generate-code
{
  branch: "feature-1733356800123",
  taskDescription: "...",
  prNumber: 123
}

// Get ONE available worker
const workerName = getAvailableWorker();  // Returns 'worker1' or 'worker2'

if (!workerName) {
  return 503; // Both busy
}

// Process with ONE worker
runNonInteractiveKiro(prompt, { timeoutMs: 600000 });
```

## Summary

| Concept | Reality |
|---------|---------|
| **User action** | Creates 1 PR request |
| **AIPM Backend** | Generates 1 PR on GitHub |
| **EC2 Request** | Sends 1 request to EC2 |
| **Worker Assignment** | Assigns to 1 worker (round-robin) |
| **Processing** | 1 worker processes 1 PR |
| **Result** | 1 PR updated with code |

**Key Principle:** 
- ✅ **1 PR = 1 Worker**
- ✅ **Round-robin** assignment when multiple PRs arrive
- ✅ **Parallel processing** when 2 PRs arrive simultaneously (Worker 1 + Worker 2)

## Architecture

```
                    AIPM Backend
                         │
                         │ Creates 1 PR
                         ↓
                    GitHub PR #123
                         │
                         │ Sends 1 request
                         ↓
                  EC2 Worker Pool
                         │
                    ┌────┴────┐
                    │         │
              Worker 1    Worker 2
                 ↑
                 │ Assigned (1 worker)
                 │
            Processes PR #123
                 │
                 ↓
            Updates PR #123
```

**Bottom Line:** AIPM generates a single PR and assigns it to one of the two EC2 workers using round-robin selection.
