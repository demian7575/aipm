# Kiro Worker Pool Architecture

## Overview

The terminal server now uses **2 persistent Kiro worker sessions** with a **health monitor manager** to process requests in parallel.

## Architecture

```
┌─────────────────────────────────────────┐
│      Kiro Terminal Server (8080)        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐      ┌──────────┐        │
│  │ Worker 1 │      │ Worker 2 │        │
│  │  (Kiro)  │      │  (Kiro)  │        │
│  └──────────┘      └──────────┘        │
│       ↓                 ↓               │
│  [busy/idle]       [busy/idle]         │
│                                         │
│  ┌─────────────────────────────┐       │
│  │   Health Monitor Manager    │       │
│  │  - Checks every 60 seconds  │       │
│  │  - Restarts idle workers    │       │
│  │  - Logs worker status       │       │
│  └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

## Components

### 1. Worker Sessions (2)

Each worker is a persistent Kiro CLI session:

- **worker1**: Processes requests
- **worker2**: Processes requests in parallel

**Worker State:**
```javascript
{
  pty: null,           // PTY session
  busy: false,         // Currently processing?
  lastActivity: Date,  // Last activity timestamp
  output: '',          // Accumulated output buffer
  queue: []            // Reserved for future use
}
```

### 2. Manager

Runs every 60 seconds to:
- Check worker health
- Restart workers idle > 5 minutes
- Log worker status (BUSY/IDLE)

### 3. Request Routing

**Round-robin with fallback:**
1. Try next worker in rotation
2. If busy, try the other worker
3. If both busy, return 503 (Service Unavailable)

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "running",
  "workers": {
    "worker1": {
      "pid": 12345,
      "busy": false,
      "lastActivity": 1733356800000
    },
    "worker2": {
      "pid": 12346,
      "busy": true,
      "lastActivity": 1733356850000
    }
  }
}
```

### Kiro API Endpoints

All endpoints use the worker pool:

- `POST /kiro/generate-story` - Generate user story
- `POST /kiro/generate-test` - Generate acceptance test
- `POST /kiro/analyze-invest` - Analyze INVEST compliance

**Parallel Processing:**
- 2 requests can be processed simultaneously
- 3rd request waits or gets 503 if both workers busy

## Worker Lifecycle

### Startup
```
1. Server starts
2. Initialize worker1
3. Initialize worker2
4. Start health monitor (60s interval)
5. Ready to accept requests
```

### Request Processing
```
1. Request arrives
2. Get available worker (round-robin)
3. Mark worker as busy
4. Send prompt to worker PTY
5. Poll output for JSON response
6. Mark worker as idle
7. Return response
```

### Auto-Recovery
```
1. Worker exits unexpectedly
   → Restart after 5 seconds

2. Worker idle > 5 minutes
   → Manager kills and restarts

3. Worker timeout (120s)
   → Mark idle, return error
```

## Testing

### Start Server
```bash
cd /repo/ebaejun/tools/aws/aipm/scripts/workers
node terminal-server.js
```

### Test Worker Pool
```bash
./test-worker-pool.sh
```

### Manual Test
```bash
# Test health
curl http://localhost:8080/health | jq

# Test parallel requests
curl -X POST http://localhost:8080/kiro/generate-story \
  -H "Content-Type: application/json" \
  -d '{"idea":"Export feature"}' &

curl -X POST http://localhost:8080/kiro/generate-story \
  -H "Content-Type: application/json" \
  -d '{"idea":"Import feature"}' &

wait
```

## Benefits

1. **Parallel Processing**: 2x throughput for Kiro requests
2. **High Availability**: One worker can fail, other continues
3. **Auto-Recovery**: Workers restart automatically
4. **Health Monitoring**: Proactive detection of stuck workers
5. **Load Balancing**: Round-robin distribution

## Monitoring

### Logs
```
📊 worker1: IDLE, last activity 45s ago
📊 worker2: BUSY, last activity 2s ago
```

### Health Endpoint
Check `/health` for real-time worker status

## Configuration

Environment variables:
- `PORT` - Server port (default: 8080)
- `REPO_PATH` - Repository path (default: /home/ec2-user/aipm)

Timeouts:
- Worker response: 120 seconds
- Health check interval: 60 seconds
- Idle restart threshold: 300 seconds (5 minutes)

## Future Enhancements

- [ ] Dynamic worker scaling (add more workers under load)
- [ ] Request queue when all workers busy
- [ ] Worker performance metrics
- [ ] Graceful shutdown handling
- [ ] Worker-specific logging
