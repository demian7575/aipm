# Kiro API Migration

## Overview

Migrated the "Generate Code & PR" flow from the PTY-based EC2 terminal server to the cleaner Kiro REST API approach.

## Changes Made

### 1. Backend Update (`apps/backend/app.js`)

**Before:**
- Called EC2 terminal server at `http://3.92.96.67:8080/generate-code`
- Sent: `{ branch, taskDescription, prNumber }`
- Complex PTY-based approach with terminal output parsing

**After:**
- Calls Kiro API server at `http://3.92.96.67:8081/execute`
- Sends: `{ prompt, context, timeoutMs }`
- Clean REST API with JSON input/output

### 2. Kiro API Server (`scripts/workers/kiro-api-server.js`)

Features:
- **POST /execute** - Execute Kiro with prompt and context
- **GET /health** - Health check endpoint
- Auto-permission approval (auto-answers `[y/n/t]` prompts)
- Dual completion detection:
  - Immediate: `[KIRO_COMPLETE]`, `Implementation complete`, `Done.` + time marker
  - Delayed: 20s idle + time marker
- JSON extraction from output
- Timeout handling (default 10 minutes)

### 3. Deployment Scripts

Created:
- `scripts/deployment/setup-kiro-api-service.sh` - Sets up systemd service on EC2
- `scripts/deployment/deploy-kiro-api.sh` - Deploys Kiro API to EC2

## Deployment Steps

### Deploy to EC2

```bash
# From local machine
./scripts/deployment/deploy-kiro-api.sh
```

This will:
1. Copy Kiro API server files to EC2
2. Set up systemd service
3. Start the service
4. Verify health check

### Manual Setup (if needed)

```bash
# SSH to EC2
ssh ec2-user@3.92.96.67

# Navigate to repo
cd ~/aipm

# Run setup script
bash scripts/deployment/setup-kiro-api-service.sh

# Check status
sudo systemctl status kiro-api-server

# View logs
tail -f /tmp/kiro-api-server.log
```

## Environment Variables

Backend (`apps/backend/app.js`):
- `KIRO_API_URL` - Kiro API endpoint (default: `http://3.92.96.67:8081`)

Kiro API Server:
- `KIRO_API_PORT` - Port to listen on (default: `8081`)
- `REPO_PATH` - Repository path (default: `/home/ec2-user/aipm`)

## Benefits

1. **Cleaner Architecture**: REST API vs PTY terminal parsing
2. **Better Error Handling**: JSON responses with structured errors
3. **Easier Testing**: Can test with curl/Postman
4. **More Reliable**: Dual completion detection reduces false positives
5. **Scalable**: Can add more endpoints or features easily

## Testing

### Test Kiro API Health

```bash
curl http://3.92.96.67:8081/health
```

Expected response:
```json
{
  "status": "running",
  "activeRequests": 0,
  "uptime": 123.45
}
```

### Test Code Generation

```bash
curl -X POST http://3.92.96.67:8081/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add a console.log statement to app.js",
    "context": "Working on AIPM project",
    "timeoutMs": 60000
  }'
```

### Test Full Flow

1. Open AIPM UI
2. Select a story with acceptance tests
3. Click "Generate Code & PR"
4. Fill in the form and submit
5. Check that PR is created on GitHub
6. Monitor Kiro API logs: `ssh ec2-user@3.92.96.67 "tail -f /tmp/kiro-api-server.log"`

## Rollback

If issues occur, revert to EC2 terminal server:

```bash
# In apps/backend/app.js, change:
const kiroApiUrl = process.env.KIRO_API_URL || 'http://3.92.96.67:8081';
fetch(`${kiroApiUrl}/execute`, ...)

# Back to:
const ec2Url = process.env.EC2_TERMINAL_URL || 'http://3.92.96.67:8080';
fetch(`${ec2Url}/generate-code`, ...)
```

## Next Steps

1. Deploy Kiro API server to EC2
2. Test the full flow end-to-end
3. Monitor logs for any issues
4. Consider adding:
   - Request queuing for multiple concurrent requests
   - Progress streaming via WebSocket
   - Task status polling endpoint
   - Metrics and monitoring
