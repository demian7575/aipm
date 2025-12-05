# Kiro Completion Detection Strategy

## Problem

Kiro CLI doesn't output consistent completion messages. Different tasks produce different output:
- "Done."
- "✓"
- "✅"
- "Implementation complete"
- Or just stops with time marker: "▸ Time: 1234ms"

## Solution: Multi-Signal Approach

### 1. Git Operations Tracking (Most Reliable) ⭐

**Why:** Code generation tasks always end with git commit + push

**Detection:**
```javascript
if (hasGitCommit && hasGitPush && idle > 10000) {
  // Task complete!
}
```

**Patterns matched:**
- `git commit` / `committed` / `Committed changes`
- `git push` / `pushed` / `Pushed to`

**Idle threshold:** 10 seconds after both operations

### 2. Time Marker + Idle (Fallback)

**Why:** Kiro always outputs time marker when finishing

**Detection:**
```javascript
if (idle > 20000 && /▸ Time:.*\d+ms/.test(output)) {
  // Task complete!
}
```

**Pattern:** `▸ Time: 1234ms`

**Idle threshold:** 20 seconds

### 3. Explicit Markers (Optional)

**Why:** Some tasks may output explicit completion signals

**Detection:**
```javascript
if (/\[KIRO_COMPLETE\]|Implementation complete|✅.*complete/i.test(output)) {
  // Task complete!
}
```

**Patterns:**
- `[KIRO_COMPLETE]` (we instruct Kiro to output this)
- `Implementation complete`
- `✅ complete` / `✅ Complete`

## How It Works

```
┌─────────────────────────────────────────────────┐
│ Kiro CLI Output Stream                          │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Track Git Operations                            │
│ • hasGitCommit = true when "git commit" seen    │
│ • hasGitPush = true when "git push" seen        │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Check Every 5 Seconds                           │
│                                                 │
│ 1. Git complete? (commit + push + 10s idle)    │
│    ✓ YES → Complete!                           │
│    ✗ NO → Continue                             │
│                                                 │
│ 2. Time marker? (▸ Time: + 20s idle)           │
│    ✓ YES → Complete!                           │
│    ✗ NO → Continue                             │
│                                                 │
│ 3. Explicit marker? ([KIRO_COMPLETE])          │
│    ✓ YES → Complete!                           │
│    ✗ NO → Continue                             │
└─────────────────────────────────────────────────┘
```

## Why This Works

### Git Operations = Ground Truth

For code generation tasks:
1. Kiro checks out branch
2. Generates code
3. **Commits changes** ← Signal 1
4. **Pushes to remote** ← Signal 2
5. May output various completion messages
6. Goes idle

By tracking git operations, we know the **actual work is done**, regardless of what Kiro says.

### Multiple Fallbacks

If git tracking fails (e.g., non-code tasks):
- Time marker detection catches most cases
- Explicit markers catch the rest

### Idle Thresholds

- **10s after git push:** Quick completion for successful tasks
- **20s after time marker:** Longer wait for edge cases
- Prevents false positives from brief pauses

## Examples

### Successful Code Generation

```
Checking out branch feature-123...
✓ Branch checked out

Generating code...
✓ Code generated

Committing changes...          ← hasGitCommit = true
✓ Committed

Pushing to remote...           ← hasGitPush = true
✓ Pushed

▸ Time: 45678ms

[10 seconds idle]              ← Complete!
```

### Task Without Git Operations

```
Analyzing code...
✓ Analysis complete

Generating report...
✓ Report generated

▸ Time: 12345ms

[20 seconds idle]              ← Complete!
```

### Task With Explicit Marker

```
Implementing feature...
✓ Feature implemented

[KIRO_COMPLETE]                ← Complete immediately!
```

## Configuration

```javascript
// In kiro-api-server.js

// Idle threshold after git operations
const GIT_IDLE_THRESHOLD = 10000; // 10 seconds

// Idle threshold for time marker fallback
const TIME_MARKER_IDLE_THRESHOLD = 20000; // 20 seconds

// Check interval
const CHECK_INTERVAL = 5000; // 5 seconds
```

## Testing

### Test Git Detection

```bash
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a test file, commit and push",
    "timeoutMs": 60000
  }'
```

Should complete ~10s after push.

### Test Time Marker Detection

```bash
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "List files in current directory",
    "timeoutMs": 60000
  }'
```

Should complete ~20s after time marker.

### Test Explicit Marker

```bash
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Echo [KIRO_COMPLETE]",
    "timeoutMs": 60000
  }'
```

Should complete immediately after marker.

## Benefits

✅ **Reliable:** Git operations are ground truth  
✅ **Flexible:** Multiple fallback methods  
✅ **Fast:** 10s completion for typical tasks  
✅ **Safe:** Won't terminate active work  
✅ **Debuggable:** Clear signals in logs  

## Monitoring

Response includes completion metadata:

```json
{
  "success": true,
  "output": "...",
  "hasGitCommit": true,
  "hasGitPush": true
}
```

Check logs for completion method used:
- "Git operations complete" → Method 1
- "Time marker detected" → Method 2
- "Explicit marker found" → Method 3
