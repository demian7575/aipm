# EC2 Functionality Verification Guide

## Quick Verification

Run the automated verification script:

```bash
./scripts/utilities/verify-ec2-services.sh
```

## EC2 Instance Details

- **Instance ID:** i-016241c7a18884e80
- **Public IP:** 3.92.96.67
- **Type:** t3.small
- **Region:** us-east-1

## Services Running on EC2

### 1. Terminal Server (Port 8080)
**Purpose:** Kiro CLI terminal server for code generation
**Health Check:** `curl http://3.92.96.67:8080/health`
**Expected Response:** `{"status":"running","kiro":{"pid":...,"running":true}}`

### 2. Kiro API (Port 8081)
**Purpose:** REST API for Kiro CLI interactions
**Health Check:** `curl http://3.92.96.67:8081/health`
**Expected Response:** `{"status":"ok"}`

### 3. PR Processor (Port 8082)
**Purpose:** GitHub PR creation and management
**Health Check:** `curl http://3.92.96.67:8082/health`
**Expected Response:** `{"status":"ok","uptime":...}`

## Manual Verification Steps

### 1. Check Health Endpoints

```bash
# Terminal Server
curl http://3.92.96.67:8080/health

# Kiro API
curl http://3.92.96.67:8081/health

# PR Processor
curl http://3.92.96.67:8082/health
```

### 2. SSH to EC2

```bash
ssh ec2-user@3.92.96.67
```

### 3. Check Service Status

```bash
# Check systemd service
sudo systemctl status kiro-terminal

# Check running processes
ps aux | grep node

# Check ports
sudo netstat -tlnp | grep -E "8080|8081|8082"
```

### 4. Check Logs

```bash
# Terminal server logs
tail -f /home/ec2-user/aipm/scripts/workers/terminal-server.log

# System logs
sudo journalctl -u kiro-terminal -f
```

### 5. Restart Services (if needed)

```bash
# Restart terminal server
sudo systemctl restart kiro-terminal

# Check status
sudo systemctl status kiro-terminal
```

## Automated Testing

Run the complete gating test suite:

```bash
./scripts/testing/run-all-gating-tests.sh
```

This includes:
- Environment tests (19 tests)
- Browser tests (90 tests)
- Optional EC2 service tests

## Troubleshooting

### Service Not Responding

1. **Check if EC2 instance is running:**
   ```bash
   aws ec2 describe-instances --instance-ids i-016241c7a18884e80 --region us-east-1
   ```

2. **SSH to EC2 and check services:**
   ```bash
   ssh ec2-user@3.92.96.67
   sudo systemctl status kiro-terminal
   ```

3. **Check logs for errors:**
   ```bash
   tail -100 /home/ec2-user/aipm/scripts/workers/terminal-server.log
   ```

4. **Restart services:**
   ```bash
   sudo systemctl restart kiro-terminal
   ```

### Port Not Accessible

1. **Check security group rules:**
   ```bash
   aws ec2 describe-security-groups --region us-east-1 --filters "Name=ip-permission.to-port,Values=8080"
   ```

2. **Verify ports are listening:**
   ```bash
   ssh ec2-user@3.92.96.67 "sudo netstat -tlnp | grep -E '8080|8081|8082'"
   ```

## Current Status

As of last check:

- ✅ **EC2 Instance:** Running
- ✅ **Terminal Server (8080):** Working
- ⚠️ **Kiro API (8081):** May not be responding (optional service)
- ✅ **PR Processor (8082):** Working

## Notes

- Kiro API (port 8081) is an optional service and may not always be running
- EC2 services are not required for core AIPM functionality
- Production gating tests mark EC2 services as optional
