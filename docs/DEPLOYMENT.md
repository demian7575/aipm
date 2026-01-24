# AIPM Deployment Guide

## Quick Deploy

Deploy to production or development with a single command:

```bash
./bin/deploy-prod prod  # Production
./bin/deploy-prod dev   # Development
```

This handles:
- ✅ Backend deployment to EC2
- ✅ Frontend deployment to S3
- ✅ Configuration updates
- ✅ Health checks
- ✅ Gating tests
- ✅ Deployment verification

## Prerequisites

1. **AWS CLI** configured with credentials
2. **SSH access** to EC2 instances
3. **GitHub token** (for PR features)
4. **Node.js 18+** installed locally

## Configuration

All deployment settings are in `config/environments.yaml`:

```yaml
production:
  ec2_ip: "44.197.204.18"
  api_port: 4000
  semantic_api_port: 8083
  s3_bucket: "aipm-static-hosting-demo"
  dynamodb_stories_table: "aipm-backend-prod-stories"
  # ...

development:
  ec2_ip: "44.222.168.46"
  # ...
```

**To update IPs or ports**: Edit `config/environments.yaml` only.

## Deployment Process

### 1. Backend Deployment

The script:
1. Loads environment config from `config/environments.yaml`
2. Creates DynamoDB tables if needed
3. Copies backend code to EC2
4. Installs dependencies on EC2
5. Restarts backend service (systemd)
6. Verifies health endpoint

### 2. Frontend Deployment

The script:
1. Builds frontend assets
2. Syncs to S3 bucket
3. Updates API endpoint in config
4. Verifies S3 website is accessible

### 3. Verification

Automatic checks:
- Backend health endpoint responds
- Frontend loads successfully
- DynamoDB tables exist
- Semantic API responds

## Manual Deployment Steps

If you need to deploy manually:

### Backend

```bash
# SSH to EC2
ssh -i ~/.ssh/aipm-key.pem ubuntu@44.197.204.18

# Update code
cd /home/ubuntu/aipm
git pull

# Install dependencies
npm install --legacy-peer-deps

# Restart services
sudo systemctl restart aipm-backend
sudo systemctl restart aipm-semantic-api
sudo systemctl restart aipm-session-pool

# Check status
sudo systemctl status aipm-backend
curl http://localhost:4000/health
```

### Frontend

```bash
# Sync to S3
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ \
  --delete \
  --cache-control "no-cache"

# Verify
curl http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
```

## Environment Variables

Backend services read from environment:

```bash
# On EC2
export STORIES_TABLE=aipm-backend-prod-stories
export ACCEPTANCE_TESTS_TABLE=aipm-backend-prod-acceptance-tests
export PRS_TABLE=aipm-backend-prod-prs
export AWS_REGION=us-east-1
export SEMANTIC_API_URL=http://localhost:8083
```

These are set by systemd service files in `scripts/systemd/`.

## Services on EC2

### Backend API (Port 4000)

```bash
# Service file: /etc/systemd/system/aipm-backend.service
sudo systemctl status aipm-backend
sudo systemctl restart aipm-backend
sudo journalctl -u aipm-backend -f
```

### Semantic API (Port 8083)

```bash
# Service file: /etc/systemd/system/aipm-semantic-api.service
sudo systemctl status aipm-semantic-api
sudo systemctl restart aipm-semantic-api
sudo journalctl -u aipm-semantic-api -f
```

### Session Pool (Port 8082)

```bash
# Service file: /etc/systemd/system/kiro-session-pool.service
sudo systemctl status kiro-session-pool
sudo systemctl restart kiro-session-pool
sudo journalctl -u kiro-session-pool -f
```

## Troubleshooting

### Backend not responding

```bash
# Check service status
sudo systemctl status aipm-backend

# Check logs
sudo journalctl -u aipm-backend -n 100

# Check port
sudo netstat -tlnp | grep 4000

# Restart
sudo systemctl restart aipm-backend
```

### Frontend not loading

```bash
# Check S3 bucket
aws s3 ls s3://aipm-static-hosting-demo/

# Check website configuration
aws s3api get-bucket-website --bucket aipm-static-hosting-demo

# Re-sync
aws s3 sync apps/frontend/public/ s3://aipm-static-hosting-demo/ --delete
```

### DynamoDB connection issues

```bash
# Check IAM role on EC2
aws sts get-caller-identity

# Check table exists
aws dynamodb describe-table --table-name aipm-backend-prod-stories

# Check table items
aws dynamodb scan --table-name aipm-backend-prod-stories --limit 5
```

### Semantic API not working

```bash
# Check if Kiro CLI is authenticated
kiro-cli --version

# Check session pool
sudo systemctl status kiro-session-pool

# Check semantic API logs
sudo journalctl -u aipm-semantic-api -f
```

## Rollback

If deployment fails:

```bash
# On EC2, revert to previous version
cd /home/ubuntu/aipm
git log --oneline -5
git checkout <previous-commit>
sudo systemctl restart aipm-backend
```

## GitHub Actions Deployment

Automated deployment via GitHub Actions:

- **Workflow**: `.github/workflows/deploy-to-prod.yml`
- **Trigger**: Push to `main` branch
- **Secrets Required**:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `EC2_SSH_KEY`

## Gating Tests

Before deployment, run gating tests:

```bash
# Load environment config
source scripts/utilities/load-env-config.sh production

# Run Phase 1 (critical infrastructure)
./scripts/testing/phase1-security-data-safety.sh

# Run Phase 2 (E2E workflow)
./scripts/testing/phase6-ui-workflow.sh
```

Or trigger via GitHub Actions:
- Go to Actions → "AIPM Structured Gating Tests"
- Click "Run workflow"
- Select environment (production/development)

## Post-Deployment Verification

1. **Check health endpoint**:
   ```bash
   curl http://44.197.204.18:4000/health
   ```

2. **Check frontend**:
   ```bash
   curl http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
   ```

3. **Test story creation**:
   ```bash
   curl -X POST http://44.197.204.18:4000/api/stories \
     -H 'Content-Type: application/json' \
     -d '{"title":"Test","asA":"user","iWant":"test","soThat":"test"}'
   ```

4. **Check semantic API**:
   ```bash
   curl http://44.197.204.18:8083/health
   ```

## Related Documentation

- [Architecture](ARCHITECTURE.md) - System architecture
- [Configuration](CONFIGURATION.md) - Environment configuration
- [Testing](TESTING.md) - Testing procedures
