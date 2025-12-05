# Worker Failure Handling - Hang/Stuck/Die Scenarios

## Current Implementation

### ✅ Already Implemented

#### 1. Worker Dies/Crashes
**Location:** `scripts/workers/terminal-server.js:47-50`

```javascript
pty_session.onExit(({ exitCode }) => {
  console.error(`❌ ${name} exited (code: ${exitCode}), restarting in 5s...`);
  setTimeout(() => startWorker(name), 5000);
});
```

**Handles:**
- Worker process crashes
- Kiro CLI exits unexpectedly
- PTY session terminates

**Action:** Auto-restart after 5 seconds ✅

#### 2. Worker Idle Too Long
**Location:** `scripts/workers/terminal-server.js:101-115`

```javascript
function monitorWorkers() {
  const now = Date.now();
  
  Object.entries(workers).forEach(([name, worker]) => {
    const idle = now - worker.lastActivity;
    
    if (idle > 300000) { // 5 min idle
      console.log(`⚠️  ${name} idle ${Math.round(idle/1000)}s, restarting...`);
      worker.pty.kill();  // Triggers onExit → auto-restart
    }
  });
}

setInterval(monitorWorkers, 60000); // Check every 60s
```

**Handles:**
- Worker stuck with no output
- Worker frozen
- Worker not responding

**Action:** Kill and restart after 5 minutes idle ✅

#### 3. Code Generation Timeout
**Location:** `scripts/workers/terminal-server.js:125-148`

```javascript
async function runNonInteractiveKiro(prompt, { timeoutMs = 600000 } = {}) {
  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Kiro non-interactive run timed out');
      finish({ success: false, timedOut: true });
    }, timeoutMs);  // 10 minutes max
    
    const finish = (result) => {
      clearTimeout(timeoutId);
      try { kiroProcess.kill('SIGKILL'); } catch (e) { /* ignore */ }
      resolve({ ...result, output });
    };
  });
}
```

**Handles:**
- Code generation takes too long (> 10 minutes)
- Kiro CLI hangs during generation

**Action:** Kill process, return timeout error ✅

#### 4. Last Activity Tracking
**Location:** `scripts/workers/terminal-server.js:34-36`

```javascript
pty_session.onData((data) => {
  workers[name].lastActivity = Date.now();  // Update on every output
  workers[name].output += data;
});
```

**Handles:**
- Tracks worker liveness
- Detects stuck workers (no output)

**Action:** Used by health monitor ✅

## ⚠️ Missing/Weak Areas

### 1. Worker Stuck DURING Code Generation

**Problem:**
```
Worker 1: BUSY (generating code)
    ↓
    5 minutes pass... still BUSY
    ↓
    10 minutes pass... still BUSY
    ↓
    Health monitor checks: lastActivity updated (output still coming)
    ↓
    But worker is actually stuck in infinite loop!
```

**Current Issue:**
- Health monitor only checks `lastActivity`
- If worker outputs anything, `lastActivity` updates
- Worker could be stuck but still producing output

**Solution Needed:**
```javascript
// Track when worker started current task
workers[name].taskStartTime = Date.now();

// In health monitor
const taskDuration = now - worker.taskStartTime;
if (worker.busy && taskDuration > 900000) { // 15 min max per task
  console.log(`⚠️  ${name} stuck on task for ${taskDuration}ms, killing...`);
  worker.pty.kill();
  worker.busy = false;
}
```

### 2. No Heartbeat During Long Operations

**Problem:**
```
Worker generating code (5 minutes)
    ↓
    No way to know if it's:
    - Working correctly
    - Stuck
    - Making progress
```

**Solution Needed:**
```javascript
// Worker should emit progress signals
// Kiro CLI could output:
// [KIRO_PROGRESS] Analyzing code...
// [KIRO_PROGRESS] Generating changes...
// [KIRO_PROGRESS] Testing changes...

// Monitor checks for progress
if (worker.busy && timeSinceLastProgress > 180000) { // 3 min no progress
  console.log(`⚠️  ${name} no progress for 3 min, killing...`);
  worker.pty.kill();
}
```

### 3. No Worker Health Status Endpoint

**Problem:**
- Can't check worker health from outside
- No visibility into worker state

**Solution Needed:**
```javascript
// Add endpoint
if (url.pathname === '/worker-health') {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    worker1: {
      status: workers.worker1.busy ? 'busy' : 'idle',
      lastActivity: workers.worker1.lastActivity,
      taskStartTime: workers.worker1.taskStartTime,
      taskDuration: workers.worker1.busy ? 
        Date.now() - workers.worker1.taskStartTime : 0
    },
    worker2: { ... }
  }));
}
```

### 4. No Retry Logic for Failed Tasks

**Problem:**
```
Worker 1 processes PR #123
    ↓
    Worker crashes/times out
    ↓
    PR #123 left incomplete
    ↓
    No retry attempted
```

**Solution Needed:**
```javascript
// Track failed tasks
const failedTasks = new Map();

// On failure
failedTasks.set(prNumber, {
  branch,
  taskDescription,
  attempts: 1,
  lastAttempt: Date.now()
});

// Retry logic
if (attempts < 3) {
  console.log(`🔄 Retrying PR #${prNumber} (attempt ${attempts + 1}/3)`);
  // Assign to different worker
}
```

## Improved Implementation

### Enhanced Worker Monitoring

```javascript
// scripts/workers/terminal-server.js

const workers = {
  worker1: { 
    pty: null, 
    busy: false, 
    lastActivity: Date.now(), 
    output: '',
    taskStartTime: null,        // NEW
    lastProgressTime: null,     // NEW
    currentTask: null,          // NEW
    consecutiveFailures: 0      // NEW
  },
  worker2: { ... }
};

// Enhanced health monitor
function monitorWorkers() {
  const now = Date.now();
  
  Object.entries(workers).forEach(([name, worker]) => {
    const idle = now - worker.lastActivity;
    const taskDuration = worker.taskStartTime ? now - worker.taskStartTime : 0;
    const timeSinceProgress = worker.lastProgressTime ? now - worker.lastProgressTime : 0;
    
    // Check 1: Idle too long (existing)
    if (!worker.busy && idle > 300000) {
      console.log(`⚠️  ${name} idle ${Math.round(idle/1000)}s, restarting...`);
      worker.pty.kill();
      return;
    }
    
    // Check 2: Task taking too long (NEW)
    if (worker.busy && taskDuration > 900000) { // 15 min max
      console.log(`⚠️  ${name} task timeout (${Math.round(taskDuration/1000)}s), killing...`);
      worker.pty.kill();
      worker.busy = false;
      worker.consecutiveFailures++;
      return;
    }
    
    // Check 3: No progress (NEW)
    if (worker.busy && timeSinceProgress > 300000) { // 5 min no progress
      console.log(`⚠️  ${name} no progress for ${Math.round(timeSinceProgress/1000)}s, killing...`);
      worker.pty.kill();
      worker.busy = false;
      worker.consecutiveFailures++;
      return;
    }
    
    // Check 4: Too many failures (NEW)
    if (worker.consecutiveFailures >= 3) {
      console.log(`⚠️  ${name} has ${worker.consecutiveFailures} consecutive failures, needs attention`);
      // Could send alert, disable worker, etc.
    }
    
    // Log status
    console.log(`📊 ${name}: ${worker.busy ? 'BUSY' : 'IDLE'}, ` +
                `activity: ${Math.round(idle/1000)}s ago, ` +
                `task: ${Math.round(taskDuration/1000)}s, ` +
                `failures: ${worker.consecutiveFailures}`);
  });
}

// Enhanced task assignment
async function assignTask(branch, taskDescription, prNumber) {
  const workerName = getAvailableWorker();
  
  if (!workerName) {
    return { success: false, error: 'All workers busy' };
  }
  
  const worker = workers[workerName];
  
  // Track task start
  worker.busy = true;
  worker.taskStartTime = Date.now();
  worker.lastProgressTime = Date.now();
  worker.currentTask = { branch, prNumber };
  
  console.log(`📍 Assigned PR #${prNumber} to ${workerName}`);
  
  try {
    const result = await runNonInteractiveKiro(taskDescription, { timeoutMs: 600000 });
    
    if (result.success) {
      worker.consecutiveFailures = 0; // Reset on success
    } else {
      worker.consecutiveFailures++;
    }
    
    return result;
    
  } catch (error) {
    worker.consecutiveFailures++;
    throw error;
    
  } finally {
    worker.busy = false;
    worker.taskStartTime = null;
    worker.currentTask = null;
  }
}
```

### Progress Tracking

```javascript
// Enhanced output monitoring
pty_session.onData((data) => {
  workers[name].lastActivity = Date.now();
  workers[name].output += data;
  
  // Detect progress signals (NEW)
  if (data.includes('[KIRO_PROGRESS]') || 
      data.includes('Analyzing') ||
      data.includes('Generating') ||
      data.includes('Testing')) {
    workers[name].lastProgressTime = Date.now();
    console.log(`✓ ${name} making progress`);
  }
  
  // Broadcast to clients
  clients.forEach(client => {
    try {
      sendWSMessage(client.socket, { type: 'output', data, worker: name });
    } catch (e) {
      clients.delete(client);
    }
  });
});
```

### Health Status Endpoint

```javascript
// Add detailed health endpoint
if (url.pathname === '/worker-health' && req.method === 'GET') {
  const now = Date.now();
  
  const health = {};
  Object.entries(workers).forEach(([name, worker]) => {
    health[name] = {
      status: worker.busy ? 'busy' : 'idle',
      pid: worker.pty?.pid,
      lastActivity: worker.lastActivity,
      idleTime: now - worker.lastActivity,
      currentTask: worker.currentTask,
      taskDuration: worker.taskStartTime ? now - worker.taskStartTime : 0,
      timeSinceProgress: worker.lastProgressTime ? now - worker.lastProgressTime : 0,
      consecutiveFailures: worker.consecutiveFailures,
      healthy: worker.consecutiveFailures < 3
    };
  });
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'running',
    timestamp: now,
    workers: health
  }));
  return;
}
```

## Monitoring Dashboard

### Health Check Response

```json
{
  "status": "running",
  "timestamp": 1733356800000,
  "workers": {
    "worker1": {
      "status": "busy",
      "pid": 12345,
      "lastActivity": 1733356795000,
      "idleTime": 5000,
      "currentTask": {
        "branch": "feature-1733356800123",
        "prNumber": 123
      },
      "taskDuration": 120000,
      "timeSinceProgress": 30000,
      "consecutiveFailures": 0,
      "healthy": true
    },
    "worker2": {
      "status": "idle",
      "pid": 12346,
      "lastActivity": 1733356700000,
      "idleTime": 100000,
      "currentTask": null,
      "taskDuration": 0,
      "timeSinceProgress": 0,
      "consecutiveFailures": 0,
      "healthy": true
    }
  }
}
```

## Summary

### ✅ Currently Handled

| Scenario | Detection | Action | Status |
|----------|-----------|--------|--------|
| Worker dies | `onExit` event | Auto-restart (5s) | ✅ Working |
| Worker idle > 5min | Health monitor | Kill & restart | ✅ Working |
| Code gen timeout | 10 min timeout | Kill process | ✅ Working |
| Process crash | `onExit` event | Auto-restart | ✅ Working |

### ⚠️ Needs Improvement

| Scenario | Current | Needed |
|----------|---------|--------|
| Task timeout | ❌ None | ✅ 15 min max per task |
| Progress tracking | ❌ None | ✅ Detect stuck workers |
| Health endpoint | ⚠️ Basic | ✅ Detailed status |
| Retry logic | ❌ None | ✅ Retry failed tasks |
| Failure tracking | ❌ None | ✅ Count consecutive failures |
| Alert system | ❌ None | ✅ Notify on repeated failures |

### Recommended Next Steps

1. **Immediate:** Add task duration timeout (15 min)
2. **Short-term:** Add progress tracking
3. **Medium-term:** Add detailed health endpoint
4. **Long-term:** Add retry logic and alerting
