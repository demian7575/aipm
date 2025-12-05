# Kiro REST API - Implementation Summary

## Overview

Implemented a queue-less architecture for automated code generation using Kiro CLI, replacing the DynamoDB queue-based approach with direct HTTP communication between Lambda and EC2.

## Architecture

```
User → Lambda → EC2 PR Processor → EC2 Worker Pool → Kiro CLI → GitHub
```

**Key Change:** Removed DynamoDB queue polling, replaced with direct Lambda → EC2 API calls.

## Components

### 1. PR Processor API (Port 8082)
**File:** `scripts/workers/pr-processor-api.js`

- Receives PR requests from Lambda
- Handles git operations (fetch, checkout, commit, push)
- Calls Worker Pool API
- Returns 202 Accepted immediately (async processing)

**Endpoints:**
- `GET /health` - Service status
- `POST /api/process-pr` - Process PR request

### 2. Worker Pool API (Port 8081)
**File:** `scripts/workers/kiro-api-server-pool.js`

- Manages 2 persistent Kiro CLI sessions using `node-pty`
- Auto-approves Kiro tool requests
- Strips ANSI codes for clean logging
- Detailed output logging with `[Worker N]` prefix

**Endpoints:**
- `GET /health` - Worker status
- `POST /execute` - Execute Kiro command

**Features:**
- Proper PTY handling for interactive CLI
- Auto-approval of tool usage (`t\r`)
- Completion detection (waits for prompt)
- Concurrent processing (2 workers)

## Workflow

1. **User** clicks "Generate Code & PR" in AIPM UI
2. **Lambda** creates PR with TASK.md, calls EC2 PR Processor
3. **PR Processor** checks out branch, calls Worker Pool
4. **Worker Pool** assigns to available Kiro worker
5. **Kiro CLI** reads TASK.md, generates code
6. **PR Processor** commits and pushes to GitHub
7. **Developer** reviews and merges PR

## Deployment

### Lambda
```bash
npx serverless deploy --stage prod
```

### EC2 Workers
```bash
# Install dependencies
cd /home/ec2-user/aipm/scripts/workers
npm install node-pty

# Start services
nohup node scripts/workers/kiro-api-server-pool.js > /tmp/kiro-worker-pool.log 2>&1 &
nohup node scripts/workers/pr-processor-api.js > /tmp/pr-processor.log 2>&1 &
```

### Security Group
Open ports 8081 and 8082 in EC2 security group.

## Monitoring

```bash
# Check worker status
curl -s http://44.220.45.57:8081/health | jq '.workers'

# Watch logs
ssh ec2-user@44.220.45.57 "tail -f /tmp/kiro-worker-pool.log"
ssh ec2-user@44.220.45.57 "tail -f /tmp/pr-processor.log"
```

## Benefits

✅ **Faster** - No 1-second polling delay  
✅ **Simpler** - Fewer components (no queue worker)  
✅ **Cheaper** - No DynamoDB queue operations  
✅ **Better observability** - Direct logs, real-time status  
✅ **More reliable** - Direct HTTP with immediate error feedback

## Performance

- **Typical PR processing:** 35-190 seconds
- **Concurrent capacity:** 2 PRs simultaneously
- **Lambda → EC2 latency:** < 100ms

## Files

- `scripts/workers/kiro-api-server-pool.js` - Worker Pool API
- `scripts/workers/pr-processor-api.js` - PR Processor API
- `docs/KIRO-API-WORKFLOW.md` - Detailed workflow documentation
- `docs/QUEUE-LESS-ARCHITECTURE.md` - Architecture overview

## Status

✅ **Deployed to Production**
- Lambda: `aipm-backend-prod-api`
- EC2: `44.220.45.57` (ports 8081, 8082)
- Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/

## Next Steps

1. Monitor production usage
2. Add more workers if needed (scale to 4-8)
3. Implement webhook callback to Lambda
4. Add retry logic for failed tasks
5. Create metrics dashboard
