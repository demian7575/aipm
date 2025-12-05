# Worker Failure Handling - Improvements Implemented

## ✅ New Features Added

### 1. Task Timeout Protection
**Prevents:** Worker stuck on single task forever

```javascript
// Check every 60 seconds
if (worker.busy && taskDuration > 900000) { // 15 min max
  console.log(`⚠️  ${name} task timeout, killing...`);
  worker.pty.kill();
  worker.busy = false;
}
```

**Before:** Worker could run indefinitely  
**After:** Max 15 minutes per task ✅

### 2. Progress Tracking
**Detects:** Worker stuck with no progress

```javascript
// Track progress signals in output
if (data.includes('[KIRO_PROGRESS]') || 
    data.includes('Analyzing') ||
    data.includes('Generating')) {
  workers[name].lastProgressTime = Date.now();
}

// Check for stalled progress
if (worker.busy && timeSinceProgress > 300000) { // 5 min
  console.log(`⚠️  ${name} no progress, killing...`);
  worker.pty.kill();
}
```

**Before:** No way to detect stuck workers  
**After:** Detects workers with no progress for 5 minutes ✅

### 3. Failure Tracking
**Monitors:** Repeated worker failures

```javascript
// Track consecutive failures
worker.consecutiveFailures = 0;  // Reset on success
worker.consecutiveFailures++;    // Increment on failure

// Alert on repeated failures
if (worker.consecutiveFailures >= 3) {
  console.log(`🚨 ${name} has 3 consecutive failures!`);
}
```

**Before:** No failure tracking  
**After:** Alerts on 3+ consecutive failures ✅

### 4. Enhanced Health Endpoint
**Provides:** Detailed worker status

```bash
curl http://44.220.45.57:8080/health
```

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
      "healthy": true
    }
  }
}
```

**Before:** Basic status only  
**After:** Full diagnostic information ✅

### 5. Task Context Tracking
**Tracks:** What each worker is doing

```javascript
worker.taskStartTime = Date.now();
worker.currentTask = { branch, prNumber };

// Visible in logs and health endpoint
console.log(`📊 worker1: BUSY, task: PR#123, duration: 120s`);
```

**Before:** No visibility into current tasks  
**After:** Full task tracking ✅

## Complete Failure Detection Matrix

| Failure Type | Detection Method | Timeout | Action |
|--------------|------------------|---------|--------|
| **Worker dies** | `onExit` event | Immediate | Restart in 5s |
| **Worker idle** | No activity | 5 minutes | Kill & restart |
| **Task timeout** | Task duration | 15 minutes | Kill & mark failed |
| **No progress** | Progress signals | 5 minutes | Kill & mark failed |
| **Code gen timeout** | Process timeout | 10 minutes | Kill process |
| **Repeated failures** | Failure counter | 3 failures | Alert |

## Health Monitor Flow

```
Every 60 seconds:
    ↓
For each worker:
    ↓
    Check 1: Idle too long? (5 min)
        → YES: Kill & restart
        → NO: Continue
    ↓
    Check 2: Task too long? (15 min)
        → YES: Kill, mark failed
        → NO: Continue
    ↓
    Check 3: No progress? (5 min)
        → YES: Kill, mark failed
        → NO: Continue
    ↓
    Check 4: Too many failures? (3+)
        → YES: Alert
        → NO: Continue
    ↓
    Log status
```

## Example Scenarios

### Scenario 1: Worker Hangs During Code Generation

```
0:00  Worker 1 starts PR #123
0:01  Progress: "Analyzing code..."
0:02  Progress: "Generating changes..."
0:05  [No more progress]
      ↓
5:00  Health monitor: "No progress for 5 min"
      → Kill worker 1
      → Mark task failed
      → Worker 1 restarts (5s)
      → Worker 1 ready for new tasks
```

### Scenario 2: Worker Stuck in Infinite Loop

```
0:00  Worker 2 starts PR #124
0:01  Output: "Processing... Processing... Processing..."
      (lastActivity keeps updating)
      (but no real progress)
      ↓
15:00 Health monitor: "Task duration > 15 min"
      → Kill worker 2
      → Mark task failed
      → Worker 2 restarts (5s)
```

### Scenario 3: Worker Crashes Repeatedly

```
0:00  Worker 1 starts PR #123
0:01  Worker 1 crashes
      → consecutiveFailures = 1
      → Restart worker 1
      
0:10  Worker 1 starts PR #125
0:11  Worker 1 crashes
      → consecutiveFailures = 2
      → Restart worker 1
      
0:20  Worker 1 starts PR #126
0:21  Worker 1 crashes
      → consecutiveFailures = 3
      → 🚨 Alert: "Worker 1 has 3 consecutive failures!"
      → Restart worker 1
```

### Scenario 4: Successful Task (Resets Failures)

```
Worker 1: consecutiveFailures = 2
    ↓
Worker 1 successfully completes PR #127
    ↓
consecutiveFailures = 0 (reset)
    ↓
Worker 1 healthy again ✅
```

## Monitoring Commands

### Check Worker Health
```bash
curl http://44.220.45.57:8080/health | jq
```

### Watch Worker Status (Live)
```bash
watch -n 5 'curl -s http://44.220.45.57:8080/health | jq ".workers"'
```

### Check Specific Worker
```bash
curl -s http://44.220.45.57:8080/health | jq '.workers.worker1'
```

### Check for Unhealthy Workers
```bash
curl -s http://44.220.45.57:8080/health | jq '.workers | to_entries[] | select(.value.healthy == false)'
```

## Logs to Watch For

### Normal Operation
```
📊 worker1: IDLE, task: none, activity: 30s ago
📊 worker2: BUSY, task: PR#123, activity: 2s ago, duration: 45s
```

### Warning Signs
```
⚠️  worker1 idle 301s, restarting...
⚠️  worker2 task timeout (901s), killing...
⚠️  worker1 no progress for 301s, killing...
```

### Critical Alerts
```
🚨 worker1 has 3 consecutive failures - needs attention!
❌ worker2 exited (code: 1), restarting in 5s...
```

## Configuration

All timeouts are configurable:

```javascript
// scripts/workers/terminal-server.js

const TIMEOUTS = {
  IDLE_RESTART: 300000,        // 5 min - restart idle workers
  TASK_MAX: 900000,            // 15 min - max time per task
  PROGRESS_MAX: 300000,        // 5 min - max time without progress
  CODE_GEN_MAX: 600000,        // 10 min - max code generation time
  HEALTH_CHECK: 60000,         // 60 sec - health check interval
  RESTART_DELAY: 5000,         // 5 sec - delay before restart
  FAILURE_THRESHOLD: 3         // 3 failures - alert threshold
};
```

## Testing

### Test Task Timeout
```bash
# Create a task that takes > 15 minutes
# Worker should be killed at 15 min mark
```

### Test Progress Timeout
```bash
# Create a task that produces no output for > 5 minutes
# Worker should be killed at 5 min mark
```

### Test Failure Tracking
```bash
# Cause 3 consecutive failures
# Should see alert: "3 consecutive failures"
```

## Summary

### Before
- ✅ Worker dies → restart
- ✅ Worker idle > 5 min → restart
- ✅ Code gen > 10 min → timeout
- ❌ No task timeout
- ❌ No progress tracking
- ❌ No failure tracking
- ❌ Limited health info

### After
- ✅ Worker dies → restart
- ✅ Worker idle > 5 min → restart
- ✅ Code gen > 10 min → timeout
- ✅ **Task > 15 min → kill & fail**
- ✅ **No progress > 5 min → kill & fail**
- ✅ **Track consecutive failures**
- ✅ **Detailed health endpoint**
- ✅ **Task context tracking**

**Result:** Comprehensive worker failure detection and recovery! 🎉
