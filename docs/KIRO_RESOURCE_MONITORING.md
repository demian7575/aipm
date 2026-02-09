# Kiro Session Pool Resource Monitoring - 2026-02-09

## Overview

Added automatic resource monitoring and protection to prevent runaway Kiro CLI processes from consuming excessive CPU or memory.

## Resource Limits

```javascript
MAX_CPU_PERCENT = 90%        // Kill if CPU exceeds 90%
MAX_MEMORY_MB = 1500MB       // Kill if memory exceeds 1.5GB
MAX_STUCK_TIME = 120000ms    // Kill if stuck for 2 minutes
RESOURCE_CHECK_INTERVAL = 30s // Check every 30 seconds
```

## How It Works

### 1. Periodic Monitoring
Every 30 seconds, the system checks each Kiro CLI session for:
- CPU usage (%)
- Memory usage (MB)
- Process uptime
- Stuck status

### 2. Automatic Protection

**High CPU + Stuck:**
- If CPU > 90% AND session stuck for > 2 minutes
- Action: Kill and restart session
- Log: `🔴 Killing session X - High CPU + stuck for Xs`

**Memory Limit Exceeded:**
- If memory > 1.5GB AND session is busy
- Action: Kill and restart session immediately
- Log: `🔴 Killing session X - Memory limit exceeded`

**Warning Logs:**
- CPU > 90%: `⚠️  Session X CPU: Y% (limit: 90%)`
- Memory > 1.5GB: `⚠️  Session X Memory: YMB (limit: 1500MB)`

### 3. Health Endpoint Enhancement

**GET /health** now includes resource information:

```json
{
  "status": "healthy",
  "poolSize": 2,
  "available": 2,
  "busy": 0,
  "stuck": 0,
  "uptime": 3600,
  "limits": {
    "maxCpu": 90,
    "maxMemoryMB": 1500,
    "maxStuckTimeMs": 120000
  },
  "sessions": [
    {
      "sessionId": 1,
      "pid": 12345,
      "cpu": 5.2,
      "memPercent": 2.1,
      "memMB": 256,
      "uptime": "00:15:30"
    },
    {
      "sessionId": 2,
      "pid": 12346,
      "cpu": 3.8,
      "memPercent": 1.9,
      "memMB": 230,
      "uptime": "00:15:30"
    }
  ]
}
```

## Monitoring Logs

### Normal Operation
```
[Monitor] Session 1 - CPU: 5.2%, Mem: 256MB, Uptime: 00:15:30
[Monitor] Session 2 - CPU: 3.8%, Mem: 230MB, Uptime: 00:15:30
```

### Warning State
```
[Monitor] ⚠️  Session 1 CPU: 92.5% (limit: 90%)
[Monitor] ⚠️  Session 2 Memory: 1650MB (limit: 1500MB)
```

### Protection Triggered
```
[Monitor] 🔴 Killing session 1 - High CPU + stuck for 125s
[Session 1] Killed due to resource limits
[Session 1] Restarting...
```

## Configuration

To adjust limits, edit `scripts/kiro-session-pool.js`:

```javascript
// Resource limits
const MAX_CPU_PERCENT = 90;      // Increase for more tolerance
const MAX_MEMORY_MB = 1500;      // Increase for larger workloads
const RESOURCE_CHECK_INTERVAL = 30000; // Check more/less frequently
const MAX_STUCK_TIME = 120000;   // Allow longer stuck time
```

## Testing

### Simulate High CPU
```bash
# In Kiro CLI, run infinite loop
while true; do echo "test"; done
```

Monitor logs:
```bash
tail -f /tmp/kiro-cli-live.log | grep Monitor
```

### Check Current Resources
```bash
curl http://localhost:8082/health | jq '.sessions'
```

### Manual Resource Check
```bash
# Get PID from health endpoint
PID=$(curl -s http://localhost:8082/health | jq -r '.sessions[0].pid')

# Monitor with top
top -p $PID

# Or with ps
watch -n 1 "ps -p $PID -o %cpu,%mem,rss,etime"
```

## Benefits

1. **Prevents System Overload** - Kills runaway processes before they crash the system
2. **Automatic Recovery** - Sessions automatically restart after being killed
3. **Visibility** - Health endpoint shows real-time resource usage
4. **Configurable** - Easy to adjust limits based on system capacity
5. **Logging** - All actions logged for debugging

## Integration with Monitoring

### Prometheus Metrics (Future)
```
kiro_session_cpu_percent{session_id="1"} 5.2
kiro_session_memory_mb{session_id="1"} 256
kiro_session_killed_total{reason="high_cpu"} 3
kiro_session_killed_total{reason="memory_limit"} 1
```

### CloudWatch Alarms (Future)
```bash
# Alert if any session exceeds 80% CPU for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name kiro-high-cpu \
  --metric-name CPUUtilization \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## Troubleshooting

**Problem:** Sessions keep getting killed
**Solution:** Increase limits or check for inefficient prompts

**Problem:** Memory keeps growing
**Solution:** Check for memory leaks in Kiro CLI or reduce POOL_SIZE

**Problem:** CPU spikes during normal operation
**Solution:** Increase MAX_CPU_PERCENT or reduce concurrent requests

## Example Scenarios

### Scenario 1: Infinite Loop in Generated Code
```
[Monitor] Session 1 - CPU: 98.5%, Mem: 450MB, Uptime: 00:02:15
[Monitor] ⚠️  Session 1 CPU: 98.5% (limit: 90%)
[Monitor] 🔴 Killing session 1 - High CPU + stuck for 130s
[Session 1] Killed due to resource limits
[Session 1] Restarting...
```

### Scenario 2: Large File Processing
```
[Monitor] Session 2 - CPU: 45.2%, Mem: 1650MB, Uptime: 00:05:00
[Monitor] ⚠️  Session 2 Memory: 1650MB (limit: 1500MB)
[Monitor] 🔴 Killing session 2 - Memory limit exceeded
[Session 2] Killed due to resource limits
[Session 2] Restarting...
```

### Scenario 3: Normal Heavy Load
```
[Monitor] Session 1 - CPU: 85.0%, Mem: 800MB, Uptime: 00:10:00
[Monitor] Session 2 - CPU: 78.0%, Mem: 750MB, Uptime: 00:10:00
# No action taken - within limits
```

## Performance Impact

- **CPU Overhead**: ~0.1% (ps command every 30s)
- **Memory Overhead**: Negligible
- **Latency Impact**: None (monitoring runs async)

## Future Enhancements

1. **Adaptive Limits** - Adjust based on system load
2. **Graceful Degradation** - Reduce POOL_SIZE if resources constrained
3. **Metrics Export** - Prometheus/CloudWatch integration
4. **Alert Notifications** - Slack/email when limits exceeded
5. **Historical Tracking** - Store resource usage over time
