# Heartbeat Worker - Quick Start Guide

## What It Does

The heartbeat worker automatically processes code generation tasks from AIPM:
- ✅ Checks queue every 1 second
- ✅ Creates branches on GitHub
- ✅ Runs kiro-cli with full repository context
- ✅ Generates actual code (not placeholders)
- ✅ Creates pull requests automatically
- ✅ Updates task status

## Setup (One Time)

### 1. Set GitHub Token
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

**To make it permanent**, add to `~/.bashrc` or `~/.zshrc`:
```bash
echo 'export GITHUB_TOKEN=ghp_your_token_here' >> ~/.bashrc
source ~/.bashrc
```

### 2. Verify Prerequisites
```bash
cd /repo/ebaejun/tools/aws/aipm
./test-heartbeat.sh
```

Should show:
```
✅ Prerequisites OK
Found X pending tasks
```

## Daily Usage

### Start the Heartbeat
```bash
cd /repo/ebaejun/tools/aws/aipm
./heartbeat-worker.sh
```

**Leave this terminal open and running.**

You'll see:
```
💓 AIPM Heartbeat Worker Started
================================
Checking queue every 1 second...
Press Ctrl+C to stop

💓 Waiting for next task...
```

### Create Tasks in AIPM

1. Open: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
2. Click on a user story
3. Click **"Generate Code & PR"**
4. Fill in the form and submit

### Watch It Work

The heartbeat will automatically:
```
🔔 New task detected!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Task: Add user profile page
🌿 Branch: feature/add-user-profile-page-1234567890

🔄 Checking out branch...
📝 Creating new branch from main...
✅ Branch created and pushed

🤖 Running Amazon Q (this may take 2-5 minutes)...

[kiro-cli output here...]

📤 Pushing changes...
🔗 Creating PR...
✅ PR #123 created: https://github.com/demian7575/aipm/pull/123
✅ Updating task status...
🎉 Task complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💓 Waiting for next task...
```

## Run in Background

### Option 1: nohup
```bash
nohup ./heartbeat-worker.sh > /tmp/heartbeat.log 2>&1 &

# Check logs
tail -f /tmp/heartbeat.log

# Stop
pkill -f heartbeat-worker
```

### Option 2: tmux/screen
```bash
# Start tmux session
tmux new -s heartbeat

# Run worker
./heartbeat-worker.sh

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t heartbeat
```

### Option 3: systemd service (Linux)
```bash
sudo tee /etc/systemd/system/aipm-heartbeat.service <<EOF
[Unit]
Description=AIPM Heartbeat Worker
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/repo/ebaejun/tools/aws/aipm
Environment="GITHUB_TOKEN=ghp_your_token_here"
ExecStart=/repo/ebaejun/tools/aws/aipm/heartbeat-worker.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl start aipm-heartbeat
sudo systemctl enable aipm-heartbeat

# Check status
sudo systemctl status aipm-heartbeat

# View logs
sudo journalctl -u aipm-heartbeat -f
```

## Troubleshooting

### No tasks detected
- Check if tasks exist: `./test-heartbeat.sh`
- Verify AWS credentials: `aws sts get-caller-identity`

### Kiro-cli not found
```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

### GitHub token not set
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### PR creation fails
- Verify token has `repo` scope
- Check if branch already has a PR

### Kiro-cli authentication fails
```bash
# Re-authenticate
kiro-cli login
```

## Architecture

```
AIPM Web UI
    ↓
Lambda (writes to DynamoDB)
    ↓
DynamoDB Queue (status: pending)
    ↓
Heartbeat Worker (your machine)
    ↓
    1. Creates branch
    2. Runs kiro-cli
    3. Generates code
    4. Creates PR
    ↓
GitHub Pull Request
```

## Benefits

✅ **Full Context** - Kiro sees entire repository  
✅ **High Quality** - Better code than API-only solutions  
✅ **No ECS Costs** - Runs on your machine  
✅ **Reliable** - No browser auth issues  
✅ **Fast** - Detects tasks within 1 second  
✅ **Automatic** - Processes queue continuously  

## Tips

- **Keep it running** - Start it in the morning, let it run all day
- **Multiple tasks** - It processes them one by one automatically
- **Check logs** - Watch the terminal to see progress
- **Stop anytime** - Ctrl+C to stop, tasks remain in queue
- **Resume anytime** - Start again and it picks up where it left off

## Next Steps

1. Start the heartbeat: `./heartbeat-worker.sh`
2. Create a task in AIPM
3. Watch it generate code automatically
4. Review the PR on GitHub
5. Merge when ready!

---

**Questions?** Check the main documentation in `DevelopmentBackground.md`
