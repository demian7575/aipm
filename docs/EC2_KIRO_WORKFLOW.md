# EC2 Kiro Server Workflow

## Overview

The Kiro terminal server on EC2 now handles **both** interactive terminal sessions and automated code generation from the queue.

## Architecture

```
┌─────────────────┐
│   User clicks   │
│ "Generate Code  │
│     & PR"       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Backend API    │
│  Creates PR +   │
│  Queue Entry    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   DynamoDB      │
│ aipm-amazon-q-  │
│     queue       │
└────────┬────────┘
         │ Polls every 5s
         ↓
┌─────────────────┐
│  EC2 Terminal   │
│     Server      │
│  (Port 8080)    │
└────────┬────────┘
         │
         ├─→ Interactive terminals (WebSocket)
         │
         └─→ Queue processing (automated)
                 │
                 ↓
            ┌─────────────┐
            │ Kiro CLI    │
            │ generates   │
            │    code     │
            └──────┬──────┘
                   │
                   ↓
            ┌─────────────┐
            │ git commit  │
            │  git push   │
            └──────┬──────┘
                   │
                   ↓
            ┌─────────────┐
            │  GitHub PR  │
            │  (updated)  │
            └─────────────┘
```

## Components

### 1. Terminal Server (EC2)
**Location:** `/home/ec2-user/terminal-server.js`
**Port:** 8080
**Functions:**
- WebSocket server for interactive terminals
- DynamoDB queue polling (every 5 seconds)
- Automated code generation
- Git operations (checkout, commit, push)

### 2. DynamoDB Queue
**Table:** `aipm-amazon-q-queue`
**Schema:**
```json
{
  "id": "task-1764574560626",
  "title": "Add login validation",
  "details": "Implement email/password validation...",
  "branch": "feature/add-login-validation-1764574560626",
  "prNumber": 42,
  "prUrl": "https://github.com/.../pull/42",
  "status": "pending" | "processing" | "complete" | "failed",
  "createdAt": "2025-12-02T05:30:00.000Z",
  "updatedAt": "2025-12-02T05:31:00.000Z",
  "error": "Optional error message"
}
```

### 3. Persistent Kiro Session
- Single Kiro CLI instance shared by all operations
- Stays running on EC2
- Handles both interactive and automated requests
- Auto-loads AIPM context on startup

## Workflow Steps

### Generate Code & PR

1. **User Action:** Clicks "Generate Code & PR" button
2. **Backend:** Creates PR + adds queue entry (status: "pending")
3. **EC2 Server:** Polls queue every 5 seconds
4. **Processing:**
   - Finds pending task
   - Updates status to "processing"
   - `git checkout <branch>`
   - Sends task to Kiro CLI
   - Waits 30 seconds for generation
   - `git commit && git push`
   - Updates status to "complete"
5. **Result:** PR updated with generated code

### Refine with Kiro

1. **User Action:** Clicks "Refine with Kiro" button
2. **Frontend:** Opens WebSocket connection to EC2:8080
3. **EC2 Server:** Connects to persistent Kiro session
4. **Auto-executes:** git checkout, git diff, etc.
5. **User:** Types commands interactively
6. **Result:** Real-time code refinement

## Management Commands

### Start/Restart Server
```bash
cd /repo/ebaejun/tools/aws/aipm
./scripts/workers/start-kiro-terminal.sh
```

### Check Server Status
```bash
ssh ec2-user@44.220.45.57 "ps aux | grep terminal-server"
```

### View Logs
```bash
ssh ec2-user@44.220.45.57 "tail -f terminal-server.log"
```

### Check Queue
```bash
aws dynamodb scan \
  --table-name aipm-amazon-q-queue \
  --region us-east-1 \
  | jq -r '.Items[] | "\(.id.S) | \(.status.S) | \(.title.S)"'
```

### Manual Task Processing
```bash
# SSH to EC2
ssh ec2-user@44.220.45.57

# Check pending tasks
aws dynamodb scan --table-name aipm-amazon-q-queue \
  --filter-expression "#status = :pending" \
  --expression-attribute-names '{"#status":"status"}' \
  --expression-attribute-values '{":pending":{"S":"pending"}}'
```

## Advantages Over Local Worker

| Feature | Local Worker | EC2 Server |
|---------|-------------|------------|
| **Always Running** | ❌ Must start manually | ✅ Always available |
| **No Local Setup** | ❌ Requires local Kiro | ✅ Runs on EC2 |
| **Shared Resource** | ❌ One user at a time | ✅ Handles multiple tasks |
| **Monitoring** | ❌ Local logs only | ✅ CloudWatch + SSH logs |
| **Reliability** | ❌ Depends on laptop | ✅ EC2 uptime |

## Configuration

### Environment Variables
```bash
PORT=8080                           # WebSocket port
REPO_PATH=/home/ec2-user/aipm      # Git repository path
AWS_REGION=us-east-1               # DynamoDB region
```

### EC2 Instance
- **Instance ID:** i-016241c7a18884e80
- **Type:** t3.small (2 vCPU, 2GB RAM)
- **IP:** 44.220.45.57 (changes on restart)
- **Cost:** ~$15/month

## Troubleshooting

### Server Not Processing Tasks
```bash
# Check if server is running
ssh ec2-user@44.220.45.57 "ps aux | grep terminal-server"

# Restart server
./scripts/workers/start-kiro-terminal.sh

# Check logs
ssh ec2-user@44.220.45.57 "tail -50 terminal-server.log"
```

### Tasks Stuck in "processing"
```bash
# Reset task status
aws dynamodb update-item \
  --table-name aipm-amazon-q-queue \
  --key '{"id":{"S":"task-XXXXX"}}' \
  --update-expression "SET #status = :pending" \
  --expression-attribute-names '{"#status":"status"}' \
  --expression-attribute-values '{":pending":{"S":"pending"}}'
```

### Kiro Session Died
```bash
# Restart server (will restart Kiro)
./scripts/workers/start-kiro-terminal.sh
```

## Migration from Local Worker

**Old workflow:**
1. Start local worker: `./scripts/workers/kiro-worker.sh`
2. Keep laptop running
3. Monitor local logs

**New workflow:**
1. Server runs automatically on EC2
2. No local setup needed
3. Monitor via SSH or CloudWatch

**No changes needed in:**
- Frontend UI
- Backend API
- DynamoDB queue structure
- PR creation flow

## Security

- ✅ EC2 has IAM role for DynamoDB access
- ✅ SSH key authentication only
- ✅ Code generated in separate branches
- ✅ Human review required before merge
- ❌ Never auto-merge generated code
