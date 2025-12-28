# AIPM Deployment Guide - Updated 2025

## 🏗️ Current Architecture

**AIPM now uses dual EC2 architecture instead of Lambda for better performance and reliability.**

### Production Environment
- **Frontend**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Backend**: http://44.220.45.57 (EC2 instance)
- **Services**: Backend API (port 80), Kiro API (port 8081), Terminal (port 8080)

### Development Environment  
- **Frontend**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **Backend**: http://44.222.168.46 (EC2 instance)
- **Services**: Backend API (port 80), Kiro API (port 8081), Terminal (port 8080)

---

## 🚀 Deployment Commands

### Production Deployment
```bash
./bin/deploy-prod
```

### Development Deployment
```bash
./bin/deploy-dev
```

### Complete Development Setup (First Time)
```bash
./scripts/setup-dev-complete.sh  # Install Kiro CLI, configure ports, copy credentials
./bin/deploy-dev                 # Deploy application
```

---

## 📋 Manual Verification

### Check Backend Status
```bash
# Production
curl http://44.220.45.57/
curl http://44.220.45.57/api/stories

# Development  
curl http://44.222.168.46/
curl http://44.222.168.46/api/stories
```

### Check Services on EC2
```bash
# Production (44.220.45.57)
ssh ec2-user@44.220.45.57 "sudo systemctl status aipm-main-backend"
ssh ec2-user@44.220.45.57 "sudo systemctl status kiro-api-v4"

# Development (44.222.168.46)
ssh ec2-user@44.222.168.46 "sudo systemctl status aipm-dev-backend"
ssh ec2-user@44.222.168.46 "sudo systemctl status kiro-api-dev"
```

---

## ⚠️ Important Notes

### Configuration Management
- **Never modify** `apps/frontend/public/config.js` during deployment
- **Always use** temporary files and direct S3 uploads for config changes
- **Environment configs** are managed separately for prod/dev

### Data Synchronization
- Development DB is **mirrored from production** during deployment
- Use `./bin/deploy-dev` to sync latest production data to development

### Legacy Lambda APIs
- Lambda APIs still exist but are **deprecated**
- All traffic now routes through EC2 backends
- Lambda functions may be removed in future cleanup

---

## 🔧 Troubleshooting

### "Using Offline Data" Message
- **Cause**: Frontend config pointing to wrong backend
- **Fix**: Check S3 config.js files point to correct EC2 IPs

### Modal JavaScript Errors
- **Cause**: Browser compatibility with dialog API
- **Fix**: Updated to use `display: flex/none` instead of `showModal()`

### Service Not Responding
- **Check**: EC2 instance status and systemd services
- **Restart**: `sudo systemctl restart [service-name]`

### Development Environment Issues
- **Run**: `./scripts/setup-dev-complete.sh` to ensure complete setup
- **Verify**: All required services (Kiro CLI, ports, credentials) are configured
