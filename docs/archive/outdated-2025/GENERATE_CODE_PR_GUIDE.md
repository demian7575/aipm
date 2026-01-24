# Generate Code & PR - User Guide

## Overview

The "Generate Code & PR" feature automates code generation using Kiro CLI running on an EC2 instance. When you create a development task, Kiro generates the implementation and creates a pull request automatically.

## How It Works

```
User clicks "Generate Code & PR"
    ↓
Backend creates PR with TASK.md placeholder
    ↓
Backend calls EC2 terminal server
    ↓
Kiro CLI generates code on EC2
    ↓
Code is committed and pushed to PR branch
    ↓
Developer reviews and merges PR
```

## Prerequisites

All prerequisites are already configured:

- ✅ EC2 instance running at `3.92.96.67:8080`
- ✅ Kiro CLI installed and running persistently
- ✅ GitHub token configured
- ✅ Repository cloned on EC2
- ✅ Backend API integrated with EC2

## Using the Feature

### Step 1: Select a Story

1. Open AIPM: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
2. Click on any user story in the mindmap or outline
3. Scroll to the "Development Tasks" section

### Step 2: Create Development Task

1. Click **"Generate Code & PR"** button
2. Fill in the form:
   - **Repository API URL**: `https://api.github.com` (default)
   - **Owner**: `demian7575` (default)
   - **Repository**: `aipm` (default)
   - **Branch name**: e.g., `feature/my-feature`
   - **Task title**: Short description
   - **Objective**: What needs to be implemented
   - **PR title**: Title for the pull request
   - **Constraints**: Technical constraints or requirements
   - **Acceptance criteria**: List of requirements (one per line)
3. Click **"Create Task"**

### Step 3: Wait for Code Generation

- PR is created immediately with TASK.md placeholder
- Kiro CLI starts generating code (takes 2-10 minutes)
- Monitor progress: `ssh ec2-user@3.92.96.67 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'`

### Step 4: Review and Merge

1. Open the PR link (shown in AIPM after creation)
2. Review the generated code
3. Test the changes
4. Merge or request modifications

## Monitoring Code Generation

### Check EC2 Terminal Server Status

```bash
curl http://3.92.96.67:8080/health
```

Expected response:
```json
{"status":"running","kiro":{"pid":34198,"running":true}}
```

### View Real-Time Logs

```bash
ssh ec2-user@3.92.96.67 'tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log'
```

### Check Kiro Process

```bash
ssh ec2-user@3.92.96.67 'ps aux | grep kiro-cli'
```

## Troubleshooting

### PR Created But No Code Generated

**Symptoms**: PR exists but only contains TASK.md

**Diagnosis**:
```bash
# Check if EC2 server is running
curl http://3.92.96.67:8080/health

# Check logs for errors
ssh ec2-user@3.92.96.67 'tail -50 /home/ec2-user/aipm/scripts/workers/terminal-server.log'
```

**Solutions**:
1. Restart terminal server: `./scripts/workers/start-kiro-terminal.sh`
2. Check Kiro CLI is authenticated
3. Verify GitHub token has push permissions

### Kiro Stuck on Approval Prompt

**Symptoms**: Logs show "Allow this action?" but no progress

**Solution**: The server auto-approves with 't' (trust). If stuck:
```bash
# Restart the terminal server
./scripts/workers/start-kiro-terminal.sh
```

### Code Generation Timeout

**Symptoms**: No commits after 10 minutes

**Causes**:
- Complex task requiring manual intervention
- Kiro waiting for user input
- Network issues

**Solution**:
```bash
# Check what Kiro is doing
ssh ec2-user@3.92.96.67 'tail -100 /home/ec2-user/aipm/scripts/workers/terminal-server.log'

# Restart if needed
./scripts/workers/start-kiro-terminal.sh
```

### Git Push Fails

**Symptoms**: Code generated but not pushed

**Diagnosis**:
```bash
ssh ec2-user@3.92.96.67 'cd /home/ec2-user/aipm && git status'
```

**Solution**:
```bash
# Manually push
ssh ec2-user@3.92.96.67 'cd /home/ec2-user/aipm && git push origin <branch-name>'
```

## Maintenance

### Restart Terminal Server

```bash
./scripts/workers/start-kiro-terminal.sh
```

This script:
1. Kills existing server
2. Pulls latest code from main
3. Installs dependencies
4. Starts new server with persistent Kiro session

### Update Repository on EC2

```bash
ssh ec2-user@3.92.96.67 'cd /home/ec2-user/aipm && git pull origin main'
```

### Check Server Logs

```bash
ssh ec2-user@3.92.96.67 'cat /home/ec2-user/aipm/scripts/workers/terminal-server.log'
```

## Architecture

### Components

1. **Frontend (AIPM UI)**
   - User interface for creating tasks
   - Located: `apps/frontend/public/app.js`

2. **Backend API (Lambda)**
   - Handles `/api/personal-delegate` endpoint
   - Creates PR and calls EC2
   - Located: `apps/backend/app.js`

3. **EC2 Terminal Server**
   - Runs persistent Kiro CLI session
   - Handles `/generate-code` endpoint
   - Located: `scripts/workers/terminal-server.js`
   - IP: `3.92.96.67:8080`

4. **Kiro CLI**
   - Generates code based on task description
   - Runs on EC2 in persistent session
   - Auto-approves tool usage with 't' (trust)

### Data Flow

```
AIPM UI → Backend API → EC2 Server → Kiro CLI → Git Push → GitHub PR
```

### Environment Variables

**Backend (Lambda)**:
- `GITHUB_TOKEN`: GitHub personal access token
- `EC2_TERMINAL_URL`: EC2 server URL (default: `http://3.92.96.67:8080`)

**EC2 Server**:
- `REPO_PATH`: Repository path (default: `/home/ec2-user/aipm`)
- `PORT`: Server port (default: `8080`)

## Best Practices

### Task Descriptions

✅ **Good**:
```
Objective: Add export to PDF feature for user stories
Constraints: Use existing PDF library, maintain current UI layout
Acceptance Criteria:
- Export button appears in story detail panel
- PDF includes story title, description, and acceptance tests
- PDF downloads with story title as filename
```

❌ **Bad**:
```
Objective: Make it better
Constraints: None
Acceptance Criteria: It should work
```

### Branch Naming

Use descriptive branch names:
- `feature/export-pdf`
- `fix/story-validation`
- `refactor/api-endpoints`

Avoid:
- `test`
- `temp`
- `branch1`

### Monitoring

Always monitor the first few code generations to ensure:
- Kiro understands the task
- Code quality meets standards
- No approval prompts are stuck

## FAQ

**Q: How long does code generation take?**
A: Typically 2-10 minutes depending on task complexity.

**Q: Can I cancel code generation?**
A: Yes, close the PR or restart the terminal server.

**Q: What if generated code has bugs?**
A: Review and fix in the PR before merging. Kiro generates starting code, not production-ready code.

**Q: Can multiple tasks run simultaneously?**
A: No, the EC2 server processes one task at a time. Queue additional tasks.

**Q: How do I know when code generation is complete?**
A: Check the PR for new commits or monitor the terminal server logs.

**Q: What happens if EC2 server crashes?**
A: Restart it with `./scripts/workers/start-kiro-terminal.sh`. In-progress tasks will fail and need to be resubmitted.

## Support

For issues or questions:
1. Check this guide first
2. Run diagnostics: `./diagnose-generate-flow.sh`
3. Check terminal server logs
4. Restart terminal server if needed
5. Contact development team if issue persists

## Related Documentation

- [DevelopmentBackground.md](../DevelopmentBackground.md) - Complete development guide
- [README.md](../README.md) - Project overview
- [terminal-server.js](../scripts/workers/terminal-server.js) - Server implementation
