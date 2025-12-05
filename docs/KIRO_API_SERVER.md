# Kiro REST API Server

Clean REST interface for Kiro CLI code generation.

## Overview

Instead of managing PTY sessions and parsing terminal output, the Kiro API Server provides a simple HTTP interface:

```
POST /execute → Send prompt → Get JSON response
```

## Setup

```bash
# Deploy to EC2
scp scripts/workers/kiro-api-server.js ec2-user@44.220.45.57:/home/ec2-user/aipm/scripts/workers/
scp scripts/deployment/setup-kiro-api-service.sh ec2-user@44.220.45.57:/home/ec2-user/aipm/scripts/deployment/

# SSH and setup
ssh ec2-user@44.220.45.57
cd /home/ec2-user/aipm
bash scripts/deployment/setup-kiro-api-service.sh
```

## API Reference

### POST /execute

Execute Kiro with a prompt and optional context.

**Request:**
```json
{
  "prompt": "Generate a user story for export feature",
  "context": "Working on AIPM project",
  "timeoutMs": 120000
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "title": "Export Data Feature",
    "description": "..."
  },
  "output": "Full Kiro output..."
}
```

### GET /health

Check server status.

**Response:**
```json
{
  "status": "running",
  "activeRequests": 2,
  "uptime": 3600
}
```

## Usage Examples

### From Terminal

```bash
# Generate user story
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate user story for export button. Respond with JSON.",
    "context": "Working on AIPM"
  }'

# Check health
curl http://localhost:8081/health
```

### From Node.js

```javascript
const response = await fetch('http://localhost:8081/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Add export button to app.js',
    context: 'AIPM project at /home/ec2-user/aipm'
  })
});

const result = await response.json();
console.log(result.success ? 'Done!' : 'Failed');
```

### From Terminal Server

Replace PTY-based code generation with API calls:

```javascript
// Old way (PTY)
const kiro = spawn('kiro-cli', ['chat']);
kiro.stdin.write(prompt);
// ... parse output ...

// New way (API)
const response = await fetch('http://localhost:8081/execute', {
  method: 'POST',
  body: JSON.stringify({ prompt, context })
});
const result = await response.json();
```

## Features

### Auto-Completion Detection

- Immediate: Detects `[KIRO_COMPLETE]`, `Implementation complete`, `Done.`
- Delayed: If no output for 20s + completion markers → done
- Timeout: 10 minutes max (configurable)

### Auto-Permission Approval

Automatically sends `t` (trust) when Kiro asks for permission.

### JSON Extraction

Automatically extracts JSON from Kiro output if present.

### Error Handling

Returns structured errors with full output for debugging.

## Service Management

```bash
# Status
sudo systemctl status kiro-api-server

# Restart
sudo systemctl restart kiro-api-server

# Logs
tail -f /tmp/kiro-api-server.log

# Stop
sudo systemctl stop kiro-api-server
```

## Benefits vs PTY Approach

| Feature | PTY (Current) | REST API (New) |
|---------|---------------|----------------|
| **Interface** | Terminal emulation | Clean HTTP |
| **Input** | Text stream | JSON |
| **Output** | Parse terminal | JSON |
| **Concurrency** | Complex (2 workers) | Simple (stateless) |
| **Monitoring** | Logs only | Health endpoint |
| **Scaling** | Limited | Easy (add servers) |
| **Testing** | Difficult | Easy (curl) |
| **Error Handling** | Parse output | Structured JSON |

## Migration Path

### Phase 1: Deploy API Server (Done)
- ✅ Create kiro-api-server.js
- ✅ Setup systemd service
- ✅ Test with examples

### Phase 2: Update Terminal Server
- Replace `runNonInteractiveKiro()` with API calls
- Remove PTY spawn logic
- Simplify worker management

### Phase 3: Scale (Future)
- Add load balancer
- Run multiple API servers
- Implement request queue

## Configuration

Environment variables:

```bash
KIRO_API_PORT=8081          # API server port
REPO_PATH=/home/ec2-user/aipm  # Repository path
```

## Troubleshooting

### Server won't start
```bash
# Check logs
tail -50 /tmp/kiro-api-server.log

# Check if port is in use
lsof -i :8081

# Restart service
sudo systemctl restart kiro-api-server
```

### Requests timeout
```bash
# Increase timeout in request
{
  "prompt": "...",
  "timeoutMs": 600000  // 10 minutes
}
```

### No JSON in response
Kiro didn't output JSON. Check `result.output` for full text.

## Example Client

See `scripts/workers/kiro-api-client-example.js` for complete examples.

```bash
node scripts/workers/kiro-api-client-example.js
```

## Next Steps

1. Deploy to EC2: `bash scripts/deployment/setup-kiro-api-service.sh`
2. Test: `curl http://localhost:8081/health`
3. Integrate with terminal server
4. Monitor performance
5. Scale as needed
