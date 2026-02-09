# Kiro CLI Lock File Protection - 2026-02-09

## Changes Made

### 1. Added Lock File Protection to kiro-session-pool.js

**New Features:**
- Lock file at `/tmp/kiro-session-pool.lock`
- PID file at `/tmp/kiro-session-pool.pid`
- Prevents multiple instances from running
- Detects and cleans up stale lock files
- Automatic cleanup on exit (SIGINT, SIGTERM, exit)

**Functions Added:**
- `checkExistingInstance()` - Checks if another instance is running
- `createLockFile()` - Creates lock and PID files
- `removeLockFile()` - Cleans up lock files on exit

**Behavior:**
- On start: Checks for existing instance
- If found and running: Exits with error message
- If found but not running: Cleans up stale lock and continues
- On exit: Automatically removes lock files

### 2. Created Health Check Script

**File:** `scripts/utilities/check-kiro-health.sh`

**Checks:**
- ✅ Lock file exists
- ✅ PID file exists
- ✅ Process is running
- ✅ CPU and memory usage
- ✅ Port 8082 is listening
- ✅ Health endpoint responding
- ✅ Available/busy/stuck session counts
- ✅ Number of kiro-cli processes

**Usage:**
```bash
./scripts/utilities/check-kiro-health.sh
```

**Output:**
```
🔍 Kiro Session Pool Health Check
==================================
📋 PID: 12345
✅ Process is running
💻 CPU: 5.2%
🧠 Memory: 2.1%
✅ Port 8082 is listening
✅ Health endpoint responding
   Available: 2
   Busy: 0
   Stuck: 0
🔢 Kiro CLI processes: 2
==================================
✅ Session pool is healthy
```

## How to Use

### Start Session Pool (with protection)
```bash
node scripts/kiro-session-pool.js
```

If already running:
```
❌ Kiro Session Pool is already running (PID: 12345)
   To kill it: kill -9 12345
   Or remove lock: rm /tmp/kiro-session-pool.lock /tmp/kiro-session-pool.pid
```

### Check Health
```bash
./scripts/utilities/check-kiro-health.sh
```

### Manual Recovery
```bash
# Kill stuck session pool
pkill -9 -f kiro-session-pool.js

# Clean up lock files
rm -f /tmp/kiro-session-pool.lock /tmp/kiro-session-pool.pid

# Kill all kiro-cli processes
pkill -9 -f "kiro-cli chat"

# Restart
node scripts/kiro-session-pool.js
```

## Benefits

1. **Prevents Duplicate Instances** - Only one session pool can run at a time
2. **Automatic Cleanup** - Lock files removed on graceful shutdown
3. **Stale Lock Detection** - Cleans up if previous instance crashed
4. **Health Monitoring** - Easy to check if session pool is healthy
5. **Process Tracking** - Always know which PID is running the pool

## Lock File Format

**Lock File** (`/tmp/kiro-session-pool.lock`):
```
2026-02-09T07:58:00.000Z
```

**PID File** (`/tmp/kiro-session-pool.pid`):
```
12345
```

## Error Messages

**Already Running:**
```
❌ Kiro Session Pool is already running (PID: 12345)
```

**Stale Lock:**
```
⚠️  Stale lock file found, cleaning up...
✅ Created lock file (PID: 67890)
```

**Corrupted Lock:**
```
⚠️  Corrupted lock file, cleaning up...
```

## Integration with Systemd

If using systemd, the lock files will be automatically cleaned up on service restart:

```ini
[Service]
ExecStartPre=/bin/rm -f /tmp/kiro-session-pool.lock /tmp/kiro-session-pool.pid
ExecStart=/usr/bin/node /path/to/kiro-session-pool.js
ExecStopPost=/bin/rm -f /tmp/kiro-session-pool.lock /tmp/kiro-session-pool.pid
```

## Troubleshooting

**Problem:** Lock file exists but process not running
**Solution:** Automatic - script detects and cleans up stale locks

**Problem:** Multiple kiro-cli processes
**Solution:** Run health check to see count, use `pkill -9 -f "kiro-cli chat"` to clean up

**Problem:** Session pool not responding
**Solution:** Check health script will detect and report issues

## Testing

Test the lock file protection:
```bash
# Terminal 1
node scripts/kiro-session-pool.js

# Terminal 2 (should fail)
node scripts/kiro-session-pool.js
# Output: ❌ Kiro Session Pool is already running (PID: ...)

# Kill Terminal 1 (Ctrl+C)
# Terminal 2 (should now work)
node scripts/kiro-session-pool.js
# Output: ✅ Created lock file (PID: ...)
```
