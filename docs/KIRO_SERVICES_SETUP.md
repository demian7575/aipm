# Kiro Services Setup Guide

## Overview

The AIPM system uses two critical services for AI-powered code generation:

1. **Kiro Session Pool** (Port 8082): Manages Kiro CLI sessions
2. **Semantic API Server** (Port 8083): Handles AI requests and routes to session pool

## Installation

### 1. Deploy Code to EC2

```bash
# From your local machine
./bin/deploy-prod prod  # or dev
```

### 2. Install Services (One-time setup)

```bash
# SSH to EC2
ssh ec2-user@<EC2_IP>

# Install services
cd aipm
sudo ./scripts/utilities/install-kiro-services.sh
```

This will:
- Install systemd service files
- Enable auto-start on boot
- Start both services
- Configure automatic restart on failure

### 3. Verify Services

```bash
# Check service status
sudo systemctl status kiro-session-pool
sudo systemctl status semantic-api-server

# Check health endpoints
curl http://localhost:8082/health
curl http://localhost:8083/health
```

## Service Management

### Start/Stop/Restart

```bash
# Session Pool
sudo systemctl start kiro-session-pool
sudo systemctl stop kiro-session-pool
sudo systemctl restart kiro-session-pool

# Semantic API
sudo systemctl start semantic-api-server
sudo systemctl stop semantic-api-server
sudo systemctl restart semantic-api-server
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u kiro-session-pool -f
sudo journalctl -u semantic-api-server -f

# Log files
tail -f /var/log/kiro-session-pool.log
tail -f /var/log/semantic-api-server.log
```

### Check Status

```bash
# Service status
systemctl is-active kiro-session-pool
systemctl is-active semantic-api-server

# Health check
curl http://localhost:8082/health | jq
curl http://localhost:8083/health | jq
```

## Troubleshooting

### Session Pool Not Responding

```bash
# Check if service is running
sudo systemctl status kiro-session-pool

# Restart service
sudo systemctl restart kiro-session-pool

# Check logs for errors
sudo journalctl -u kiro-session-pool -n 100
```

### Semantic API Errors

```bash
# Check if session pool is healthy first
curl http://localhost:8082/health

# Restart semantic API
sudo systemctl restart semantic-api-server

# Check logs
sudo journalctl -u semantic-api-server -n 100
```

### Services Not Starting on Boot

```bash
# Enable services
sudo systemctl enable kiro-session-pool
sudo systemctl enable semantic-api-server

# Verify enabled
systemctl is-enabled kiro-session-pool
systemctl is-enabled semantic-api-server
```

## Health Check Endpoints

### Session Pool (Port 8082)

```bash
curl http://localhost:8082/health
```

Response:
```json
{
  "status": "healthy",
  "poolSize": 4,
  "available": 3,
  "busy": 1,
  "stuck": 0,
  "uptime": 3600
}
```

### Semantic API (Port 8083)

```bash
curl http://localhost:8083/health
```

Response:
```json
{
  "status": "healthy",
  "sessionPool": "http://localhost:8082"
}
```

## Automatic Recovery

Both services are configured with:
- **Restart=always**: Automatically restart on failure
- **RestartSec=10**: Wait 10 seconds before restart
- **After=network.target**: Start after network is ready

## Monitoring

### Gating Tests

Phase 1 tests now include Session Pool health check:
- ✅ Verifies session pool is running
- ✅ Checks available sessions
- ❌ Fails deployment if unhealthy

### Manual Check

```bash
# Quick health check
curl -s http://localhost:8082/health | jq '.status'
curl -s http://localhost:8083/health | jq '.status'
```

## Uninstall

```bash
# Stop services
sudo systemctl stop kiro-session-pool
sudo systemctl stop semantic-api-server

# Disable services
sudo systemctl disable kiro-session-pool
sudo systemctl disable semantic-api-server

# Remove service files
sudo rm /etc/systemd/system/kiro-session-pool.service
sudo rm /etc/systemd/system/semantic-api-server.service

# Reload systemd
sudo systemctl daemon-reload
```
