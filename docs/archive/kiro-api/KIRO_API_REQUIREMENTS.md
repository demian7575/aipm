# Kiro API Requirements

## System Requirements

### EC2 Instance
- **OS:** Amazon Linux 2 or Ubuntu
- **Instance Type:** t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **Storage:** 20GB+ for repository and logs
- **Network:** Port 8081 open for API access

### Software Dependencies
- **Node.js:** v18+ (for running the API server)
- **Kiro CLI:** Installed and authenticated
  - Location: `~/.local/bin/kiro-cli` or in PATH
  - Must be able to run: `kiro-cli chat`
- **Git:** Configured with credentials for pushing to repository
- **Bash:** For spawning Kiro CLI sessions

### Environment Variables
```bash
# Required
PATH=/home/ec2-user/.local/bin:/usr/local/bin:/usr/bin:/bin

# Optional
KIRO_API_PORT=8081              # Default: 8081
REPO_PATH=/home/ec2-user/aipm   # Default: /home/ec2-user/aipm
NODE_ENV=production
```

## Installation Requirements

### 1. Kiro CLI Setup
```bash
# Install Kiro CLI
curl -fsSL https://kiro.aws.dev/install.sh | sh

# Authenticate (requires browser)
kiro-cli auth login

# Verify
kiro-cli --version
```

### 2. Repository Setup
```bash
# Clone repository
cd ~
git clone https://github.com/demian7575/aipm.git
cd aipm

# Configure git
git config user.name "AIPM Bot"
git config user.email "aipm-bot@example.com"

# Set up credentials (SSH key or token)
```

### 3. Node.js Setup
```bash
# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify
node --version  # Should be v18+
```

### 4. Systemd Service
```bash
# Copy service file
sudo cp /path/to/kiro-api-server.service /etc/systemd/system/

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable kiro-api-server
sudo systemctl start kiro-api-server
```

## Runtime Requirements

### Permissions
- **File System:** Read/write access to repository directory
- **Network:** Outbound HTTPS for Kiro CLI and git operations
- **Process:** Ability to spawn child processes (Kiro CLI sessions)

### Resource Limits
- **Max Concurrent Sessions:** 2 (configurable via `MAX_CONCURRENT`)
- **Memory per Session:** ~500MB
- **Timeout per Request:** 10 minutes (600,000ms, configurable)
- **Disk Space:** ~100MB per session for temporary files

### Git Configuration
```bash
# Must be configured for automated commits
git config --global user.name "AIPM Bot"
git config --global user.email "aipm-bot@example.com"

# SSH key or credential helper for push
ssh-keygen -t ed25519 -C "aipm-bot@example.com"
# Add public key to GitHub
```

## API Endpoints

### POST /execute
**Purpose:** Execute Kiro CLI with a prompt

**Request:**
```json
{
  "prompt": "string (required)",
  "context": "string (optional)",
  "timeoutMs": "number (optional, default: 600000)"
}
```

**Response:**
```json
{
  "success": true,
  "output": "string",
  "hasGitCommit": true,
  "hasGitPush": true
}
```

**Requirements:**
- Content-Type: application/json
- Max prompt length: 10,000 characters
- Max timeout: 30 minutes (1,800,000ms)

### GET /health
**Purpose:** Health check and status

**Response:**
```json
{
  "status": "running",
  "activeRequests": 1,
  "queuedRequests": 3,
  "maxConcurrent": 2,
  "uptime": 123.45
}
```

**Requirements:**
- No authentication required
- Should respond within 100ms

## Security Requirements

### Network Security
- **Firewall:** Only allow port 8081 from trusted IPs (backend Lambda)
- **CORS:** Configured for specific origins only
- **Rate Limiting:** Consider adding if exposed publicly

### Authentication
- **Current:** None (internal service)
- **Recommended:** Add API key or JWT for production
- **Alternative:** Use AWS VPC and security groups

### Input Validation
- Sanitize prompts to prevent command injection
- Limit prompt length to prevent DoS
- Validate timeout values

## Monitoring Requirements

### Logs
- **Location:** `/tmp/kiro-api-server.log`
- **Rotation:** Implement log rotation (logrotate)
- **Retention:** Keep 7 days minimum

### Metrics to Track
- Request count
- Success/failure rate
- Average completion time
- Queue length
- Active sessions
- Git operation success rate

### Alerts
- Service down
- High error rate (>10%)
- Queue backing up (>5 requests)
- Disk space low (<2GB)
- Memory usage high (>80%)

## Deployment Requirements

### Files Needed
```
scripts/workers/kiro-api-server.js          # Main server
scripts/deployment/setup-kiro-api-service.sh # Setup script
/etc/systemd/system/kiro-api-server.service  # Service file
```

### Deployment Steps
1. Copy files to EC2
2. Run setup script
3. Verify health check
4. Test with sample request
5. Monitor logs for errors

### Rollback Plan
- Keep previous version of server file
- Systemd service can be stopped/restarted
- No database migrations needed

## Testing Requirements

### Unit Tests
- Completion detection logic
- Queue management
- Git operation tracking

### Integration Tests
```bash
# Health check
curl http://localhost:8081/health

# Simple execution
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List files", "timeoutMs": 30000}'

# Code generation
curl -X POST http://localhost:8081/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create test.txt with hello world, commit and push"}'
```

### Load Tests
- 10 concurrent requests
- 100 requests over 10 minutes
- Verify queue management works

## Maintenance Requirements

### Regular Tasks
- **Daily:** Check logs for errors
- **Weekly:** Review queue metrics
- **Monthly:** Update Kiro CLI to latest version
- **Quarterly:** Review and optimize completion detection

### Updates
```bash
# Update Kiro CLI
kiro-cli update

# Update server code
cd ~/aipm
git pull origin develop
sudo systemctl restart kiro-api-server

# Verify
curl http://localhost:8081/health
```

### Backup
- Repository is backed up via git
- No persistent state to backup
- Service configuration in systemd file

## Performance Requirements

### Response Times
- Health check: <100ms
- Simple tasks: <30s
- Code generation: 2-10 minutes
- Max timeout: 10 minutes

### Throughput
- 2 concurrent requests (configurable)
- Queue unlimited (memory permitting)
- ~6-30 requests per hour (depending on task complexity)

### Resource Usage
- CPU: <50% average, <80% peak
- Memory: <2GB average, <3GB peak
- Disk I/O: Minimal (git operations only)
- Network: <10MB/s

## Compatibility Requirements

### Backend Integration
- Backend must call `POST /execute` with proper JSON
- Backend must handle async responses (fire-and-forget)
- Backend must not wait for completion (10min timeout)

### Kiro CLI Versions
- Tested with: Kiro CLI v1.x
- Should work with: Any version supporting `kiro-cli chat`
- Breaking changes: Monitor Kiro CLI release notes

### Git Providers
- GitHub (primary)
- GitLab (should work)
- Bitbucket (should work)
- Any git remote with SSH/HTTPS access

## Troubleshooting Requirements

### Common Issues

**Kiro CLI not found**
```bash
# Check PATH
echo $PATH | grep .local/bin

# Verify installation
which kiro-cli
kiro-cli --version
```

**Git push fails**
```bash
# Check credentials
ssh -T git@github.com

# Check git config
git config --list
```

**Service won't start**
```bash
# Check logs
sudo journalctl -u kiro-api-server -n 50

# Check permissions
ls -la ~/aipm/scripts/workers/kiro-api-server.js

# Test manually
cd ~/aipm
node scripts/workers/kiro-api-server.js
```

**Requests timeout**
- Increase `timeoutMs` in request
- Check Kiro CLI is responding
- Review completion detection logic

## Documentation Requirements

- [x] API endpoint documentation
- [x] Deployment guide
- [x] Completion detection strategy
- [x] Troubleshooting guide
- [ ] Architecture diagram
- [ ] Sequence diagrams
- [ ] Runbook for operations team
