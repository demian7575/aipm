# Kiro API Workflow Documentation

## Architecture Overview

```
┌─────────────┐
│   Browser   │ User clicks "Generate Code & PR"
│   (AIPM UI) │
└──────┬──────┘
       │ POST /api/delegate/personal
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda (API Gateway)                  │
│                  apps/backend/app.js                         │
│                                                              │
│  1. Create branch: feature/{title}-{timestamp}              │
│  2. Create TASK.md with requirements                        │
│  3. Create GitHub PR                                        │
│  4. Store PR in DynamoDB                                    │
│  5. Call EC2 PR Processor (fire-and-forget)                │
└──────┬──────────────────────────────────────────────────────┘
       │ POST http://44.220.45.57:8082/api/process-pr
       │ { prNumber, branch, repo, owner, taskDetails }
       ▼
┌─────────────────────────────────────────────────────────────┐
│              EC2 - PR Processor API (Port 8082)             │
│           scripts/workers/pr-processor-api.js               │
│                                                              │
│  1. Return 202 Accepted immediately                         │
│  2. Background processing:                                  │
│     - git stash (save local changes)                        │
│     - git fetch origin {branch}                             │
│     - git checkout {branch}                                 │
│     - Call Worker Pool API                                  │
└──────┬──────────────────────────────────────────────────────┘
       │ POST http://localhost:8081/execute
       │ { prompt: "Read TASK.md...", timeoutMs: 300000 }
       ▼
┌─────────────────────────────────────────────────────────────┐
│            EC2 - Worker Pool API (Port 8081)                │
│         scripts/workers/kiro-api-server-pool.js             │
│                                                              │
│  Maintains 2 persistent Kiro CLI sessions (node-pty)       │
│                                                              │
│  1. Find available worker (not busy, ready)                 │
│  2. Send prompt to Kiro CLI: worker.pty.write(prompt)      │
│  3. Auto-approve tool requests: worker.pty.write('t\r')    │
│  4. Collect output: worker.output += data                   │
│  5. Detect completion: clean.includes('Model:')             │
│  6. Return result: { success: true, output }                │
└──────┬──────────────────────────────────────────────────────┘
       │ Kiro CLI generates code
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Kiro CLI Process                        │
│                                                              │
│  1. Read TASK.md from checked-out branch                    │
│  2. Analyze requirements                                    │
│  3. Request tool approvals (auto-approved by worker)        │
│  4. Generate/modify code files                              │
│  5. Return to prompt (Model:)                               │
└──────┬──────────────────────────────────────────────────────┘
       │ Returns output to Worker Pool
       ▼
┌─────────────────────────────────────────────────────────────┐
│              PR Processor (continued)                        │
│                                                              │
│  1. Receive Kiro output                                     │
│  2. git add -A                                              │
│  3. git commit -m "feat: implement feature via Kiro CLI"    │
│  4. git push origin {branch}                                │
│  5. Log completion                                          │
└──────┬──────────────────────────────────────────────────────┘
       │ PR updated on GitHub
       ▼
┌─────────────────────────────────────────────────────────────┐
│                         GitHub                               │
│                                                              │
│  PR now contains generated code                             │
│  Developer reviews and merges                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Breakdown

### 1. Lambda Backend (API Gateway)

**File:** `apps/backend/app.js`  
**Function:** `performDelegation()`  
**Trigger:** User clicks "Generate Code & PR" button

**Process:**
```javascript
// 1. Create branch
const branchName = `feature/${taskTitle}-${timestamp}`;
await githubRequest(`${repoPath}/git/refs`, {
  method: 'POST',
  body: JSON.stringify({
    ref: `refs/heads/${branchName}`,
    sha: baseRef.object.sha
  })
});

// 2. Create TASK.md
const content = Buffer.from(`# ${taskTitle}\n\n${objective}...`).toString('base64');
await githubRequest(`${repoPath}/contents/TASK.md`, {
  method: 'PUT',
  body: JSON.stringify({ message: `feat: ${taskTitle}`, content, branch: branchName })
});

// 3. Create PR
const pr = await githubRequest(`${repoPath}/pulls`, {
  method: 'POST',
  body: JSON.stringify({ title, head: branchName, base: baseBranch, body })
});

// 4. Call EC2 (fire-and-forget)
fetch(`http://44.220.45.57:8082/api/process-pr`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prNumber: pr.number, branch: branchName, repo, owner, taskDetails })
});
```

**Response to User:** PR URL immediately (doesn't wait for code generation)

---

### 2. PR Processor API (Port 8082)

**File:** `scripts/workers/pr-processor-api.js`  
**Technology:** Node.js HTTP server  
**Purpose:** Orchestrate git operations and Kiro execution

**Endpoints:**

#### `GET /health`
```json
{
  "status": "ok",
  "uptime": 12345.67
}
```

#### `POST /api/process-pr`
**Request:**
```json
{
  "prNumber": 123,
  "branch": "feature/task-name-123456",
  "repo": "aipm",
  "owner": "demian7575",
  "taskDetails": "As a user, I want..."
}
```

**Response:** `202 Accepted` (immediate)
```json
{
  "status": "accepted",
  "prNumber": 123,
  "branch": "feature/task-name-123456"
}
```

**Background Processing:**
```javascript
async function processInBackground(prNumber, branch, repo, owner, taskDetails) {
  // 1. Git operations
  execSync('git stash', { cwd: repoPath });
  execSync(`git fetch origin ${branch}`, { cwd: repoPath });
  execSync(`git checkout ${branch}`, { cwd: repoPath });
  
  // 2. Call Worker Pool
  const response = await fetch('http://localhost:8081/execute', {
    method: 'POST',
    body: JSON.stringify({
      prompt: `Read TASK.md and implement the feature. ${taskDetails}`,
      timeoutMs: 300000
    })
  });
  
  const result = await response.json();
  
  // 3. Commit and push
  if (result.success) {
    execSync('git add -A', { cwd: repoPath });
    execSync('git commit -m "feat: implement feature via Kiro CLI"', { cwd: repoPath });
    execSync(`git push origin ${branch}`, { cwd: repoPath });
  }
}
```

---

### 3. Worker Pool API (Port 8081)

**File:** `scripts/workers/kiro-api-server-pool.js`  
**Technology:** Node.js HTTP server + node-pty  
**Purpose:** Manage persistent Kiro CLI sessions

**Architecture:**
```javascript
const workers = [
  {
    id: 1,
    pty: <Kiro CLI PTY>,
    busy: false,
    ready: true,
    output: '',
    currentTask: null
  },
  {
    id: 2,
    pty: <Kiro CLI PTY>,
    busy: false,
    ready: true,
    output: '',
    currentTask: null
  }
];
```

**Endpoints:**

#### `GET /health`
```json
{
  "status": "running",
  "workers": [
    {
      "id": 1,
      "busy": false,
      "ready": true,
      "currentTask": null,
      "idle": 123,
      "restarts": 0
    },
    {
      "id": 2,
      "busy": false,
      "ready": true,
      "currentTask": null,
      "idle": 123,
      "restarts": 0
    }
  ],
  "queued": 0,
  "uptime": 12345.67
}
```

#### `POST /execute`
**Request:**
```json
{
  "prompt": "Read TASK.md and implement the feature...",
  "timeoutMs": 300000
}
```

**Response:**
```json
{
  "success": true,
  "output": "... Kiro's complete output ...",
  "timeout": false
}
```

**Processing Logic:**
```javascript
// 1. Find available worker
const worker = workers.find(w => !w.busy && w.ready);

// 2. Mark as busy
worker.busy = true;
worker.currentTask = prompt.substring(0, 50);
worker.output = '';

// 3. Send to Kiro
worker.pty.write(prompt + '\r');

// 4. Auto-approve tools
worker.pty.onData((data) => {
  const clean = stripAnsi(data);
  if (clean.includes('[y/n/t]')) {
    worker.pty.write('t\r'); // Trust tool
  }
});

// 5. Detect completion
const checkInterval = setInterval(() => {
  if (clean.includes('Model:') && elapsed > 5000) {
    clearInterval(checkInterval);
    worker.busy = false;
    return { success: true, output: worker.output };
  }
}, 2000);
```

**Key Features:**
- **node-pty:** Proper PTY handling for interactive CLI
- **ANSI stripping:** Clean text for detection
- **Auto-approval:** Automatically trusts Kiro tools
- **Completion detection:** Waits for Kiro to return to prompt
- **Detailed logging:** All output logged with `[Worker N]` prefix

---

## Data Flow Example

### User Creates PR for "Add Export Button"

**1. User Input:**
```
Title: Add Export Button
Objective: Add an export button to the UI
Constraints: Use existing button styles
Acceptance Criteria: Button appears in header, exports data as JSON
```

**2. Lambda Creates:**
```
Branch: feature/add-export-button-1733420400000
TASK.md:
  # Add Export Button
  
  Add an export button to the UI
  
  Constraints: Use existing button styles
  
  Acceptance Criteria:
  - Button appears in header
  - Exports data as JSON
  
  ⏳ Code is being generated by Kiro CLI...

PR: https://github.com/demian7575/aipm/pull/346
```

**3. Lambda Calls EC2:**
```http
POST http://44.220.45.57:8082/api/process-pr
{
  "prNumber": 346,
  "branch": "feature/add-export-button-1733420400000",
  "repo": "aipm",
  "owner": "demian7575",
  "taskDetails": "Add an export button to the UI. Constraints: Use existing button styles. Acceptance Criteria: - Button appears in header - Exports data as JSON"
}
```

**4. PR Processor:**
```bash
git fetch origin feature/add-export-button-1733420400000
git checkout feature/add-export-button-1733420400000
# Now on branch with TASK.md
```

**5. Worker Pool Receives:**
```http
POST http://localhost:8081/execute
{
  "prompt": "Read TASK.md and implement the feature. Add an export button...",
  "timeoutMs": 300000
}
```

**6. Kiro CLI:**
```
> Read TASK.md and implement the feature...

Thinking... (analyzing TASK.md)
I'll add an export button to the header...

[Tool Request] fs_write - Create export button
Allow this action? [y/n/t]: t  ← Auto-approved

Writing to apps/frontend/public/app.js...
Added export button to header
Added click handler to export JSON

Model: Auto (/model to change)  ← Completion detected
```

**7. PR Processor Commits:**
```bash
git add -A
git commit -m "feat: implement feature via Kiro CLI"
git push origin feature/add-export-button-1733420400000
```

**8. GitHub PR Updated:**
```
PR #346 now contains:
- Modified: apps/frontend/public/app.js
  + Export button in header
  + JSON export functionality
```

**9. Developer Reviews & Merges**

---

## Monitoring & Debugging

### Check System Status
```bash
# Worker Pool
curl -s http://44.220.45.57:8081/health | jq '.'

# PR Processor
curl -s http://44.220.45.57:8082/health | jq '.'
```

### Watch Logs
```bash
# PR Processor logs
ssh ec2-user@44.220.45.57 "tail -f /tmp/pr-processor.log"

# Worker Pool logs (shows Kiro output)
ssh ec2-user@44.220.45.57 "tail -f /tmp/kiro-worker-pool.log"

# Lambda logs
aws logs tail /aws/lambda/aipm-backend-prod-api --follow
```

### Check Worker Status
```bash
curl -s http://44.220.45.57:8081/health | jq '.workers[] | {id, busy, ready, currentTask}'
```

**Output:**
```json
{
  "id": 1,
  "busy": true,
  "ready": true,
  "currentTask": "Read TASK.md and implement the feature. Add an ex"
}
{
  "id": 2,
  "busy": false,
  "ready": true,
  "currentTask": null
}
```

---

## Error Handling

### Lambda → EC2 Connection Fails
- Lambda logs: `⚠️ EC2 API call failed for PR #XXX: fetch failed`
- **Cause:** Port 8082 not open in security group
- **Fix:** Open port 8082 in EC2 security group

### No Workers Available
- Response: `503 Service Unavailable`
- **Cause:** Both workers busy or not ready
- **Fix:** Wait or add more workers

### Kiro Timeout
- Response: `{ success: true, output: "...", timeout: true }`
- **Cause:** Task took > 5 minutes
- **Fix:** Increase `timeoutMs` or simplify task

### Git Push Fails
- Log: `❌ Git operations failed for PR #XXX`
- **Cause:** Merge conflicts or permissions
- **Fix:** Manual intervention required

---

## Configuration

### Environment Variables

**Lambda:**
```bash
EC2_PR_PROCESSOR_URL=http://44.220.45.57:8082  # Optional, defaults to this
```

**EC2:**
```bash
# No environment variables needed
# Ports hardcoded: 8081 (Worker Pool), 8082 (PR Processor)
```

### Security Group Rules

**Required Inbound Rules:**
- Port 22 (SSH)
- Port 8081 (Worker Pool API)
- Port 8082 (PR Processor API)

---

## Deployment

### Deploy Lambda
```bash
cd /repo/ebaejun/tools/aws/aipm
npx serverless deploy --stage prod
```

### Deploy EC2 Workers
```bash
# Copy files
scp kiro-api-server-pool.js ec2-user@44.220.45.57:/home/ec2-user/aipm/scripts/workers/
scp pr-processor-api.js ec2-user@44.220.45.57:/home/ec2-user/aipm/scripts/workers/

# Install dependencies
ssh ec2-user@44.220.45.57 "cd /home/ec2-user/aipm/scripts/workers && npm install node-pty"

# Start services
ssh ec2-user@44.220.45.57 << 'ENDSSH'
cd /home/ec2-user/aipm
pkill -f kiro-api-server-pool
pkill -f pr-processor-api
nohup node scripts/workers/kiro-api-server-pool.js > /tmp/kiro-worker-pool.log 2>&1 &
nohup node scripts/workers/pr-processor-api.js > /tmp/pr-processor.log 2>&1 &
ENDSSH
```

---

## Performance Metrics

**Typical Timings:**
- Lambda PR creation: 2-3 seconds
- Git checkout: 1-2 seconds
- Kiro code generation: 30-180 seconds (depends on complexity)
- Git commit & push: 2-3 seconds
- **Total:** 35-190 seconds

**Capacity:**
- 2 concurrent Kiro sessions
- Can process 2 PRs simultaneously
- Queue additional requests (503 if both busy)

---

## Future Enhancements

1. **Add more workers** - Scale to 4-8 Kiro sessions
2. **Webhook callback** - Notify Lambda when complete
3. **Status endpoint** - Check PR processing status
4. **Retry logic** - Auto-retry failed tasks
5. **Metrics dashboard** - Track success rate, timing
6. **Worker health checks** - Auto-restart crashed workers
