# AIPM Architecture Update - December 2025

**Last Updated:** 2025-12-28  
**Status:** Current Dual EC2 Architecture  
**Migration:** Lambda → EC2 Backend Complete

---

## 🏗️ Current Production Architecture (Updated)

### Frontend Layer
```
S3 Static Hosting
├── Production: aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
├── Development: aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
└── Technology: Vanilla JS + CSS (no build process)
```

### Backend Layer - **MIGRATED TO EC2**
```
Dual EC2 Architecture
├── Production EC2: 3.92.96.67 (aipm-docker-builder-v2)
│   ├── Backend API: Port 80 (nginx → Node.js:4000)
│   ├── Kiro API: Port 8081 (Code generation)
│   ├── Terminal Server: Port 8080 (Worker pool)
│   ├── Services: systemd managed
│   └── Data: aipm-backend-prod-* tables
├── Development EC2: 44.222.168.46 (aipm-dev-server)
│   ├── Backend API: Port 80 (nginx → Node.js:4000)
│   ├── Kiro API: Port 8081 (Code generation)
│   ├── Terminal Server: Port 8080 (Worker pool)
│   ├── Services: systemd managed
│   └── Data: aipm-backend-dev-* tables
└── Instance Type: t3.small, Amazon Linux 2023
```

### Legacy Lambda Layer - **DEPRECATED**
```
AWS Lambda (Still exists but not used)
├── Production: wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
├── Development: eppae4ae82.execute-api.us-east-1.amazonaws.com/dev
└── Status: Functional but bypassed by EC2 backends
```

### Data Layer
```
DynamoDB Tables (Unchanged)
├── aipm-backend-prod-stories (8 stories)
├── aipm-backend-prod-acceptance-tests
├── aipm-backend-dev-stories (8 stories - mirrored from prod)
├── aipm-backend-dev-acceptance-tests
└── aipm-amazon-q-queue (Code generation queue)
```

---

## 🔄 Architecture Migration Summary

### What Changed
- **Backend**: Lambda → Dedicated EC2 instances
- **Environment Isolation**: Separate EC2 servers for prod/dev
- **Data Mirroring**: Development DB synced from production
- **Service Management**: systemd services for reliability

### Why Changed
- **Performance**: Eliminated Lambda cold starts
- **Reliability**: Dedicated resources, no timeout limits
- **Development**: Isolated environment for testing
- **Cost**: Predictable EC2 costs vs Lambda per-request

### Current Status
- ✅ **Production**: http://3.92.96.67 (EC2 backend)
- ✅ **Development**: http://44.222.168.46 (EC2 backend)
- ❌ **Lambda APIs**: Deprecated but still deployed

---

## 📋 Service Configuration

### Production EC2 (3.92.96.67)
```bash
# Services
sudo systemctl status aipm-main-backend    # Port 4000 → nginx:80
sudo systemctl status kiro-api-v4          # Port 8081
sudo systemctl status aipm-terminal-server # Port 8080

# Environment
ENVIRONMENT=production
STAGE=prod
STORIES_TABLE=aipm-backend-prod-stories
ACCEPTANCE_TESTS_TABLE=aipm-backend-prod-acceptance-tests
```

### Development EC2 (44.222.168.46)
```bash
# Services
sudo systemctl status aipm-dev-backend     # Port 4000 → nginx:80
sudo systemctl status kiro-api-dev         # Port 8081
sudo systemctl status aipm-terminal-server-dev # Port 8080

# Environment
ENVIRONMENT=development
STAGE=dev
STORIES_TABLE=aipm-backend-dev-stories
ACCEPTANCE_TESTS_TABLE=aipm-backend-dev-acceptance-tests
```

---

## 🚀 Deployment Commands

### Production Deployment
```bash
./bin/deploy-prod  # Uses existing Lambda deployment
```

### Development Deployment
```bash
./bin/deploy-dev   # Uses new EC2 deployment script
```

### Manual EC2 Setup
```bash
./scripts/setup-dev-complete.sh  # Install Kiro CLI, open ports, copy credentials
```

---

## ⚠️ Known Issues & Fixes

### Configuration Management
- **Issue**: Local `config.js` affects both environments
- **Fix**: Use environment-specific S3 deployment only
- **Lesson**: Never modify local config during deployment

### Data Synchronization
- **Issue**: Development DB had stale test data
- **Fix**: Implemented production → development mirroring
- **Process**: Clear dev tables → Copy prod data

### Modal JavaScript Error
- **Issue**: `modal.showModal()` not supported on `<div>` elements
- **Fix**: Use `modal.style.display = 'flex'` instead
- **Root Cause**: Mixed HTML5 dialog API with div implementation

---

## 📊 Current Metrics

| Environment | Backend | Stories | Status |
|-------------|---------|---------|--------|
| Production | 3.92.96.67 | 4 active | ✅ Working |
| Development | 44.222.168.46 | 4 active | ✅ Working |
| Lambda Prod | wk6h5fkqk9... | N/A | ⚠️ Deprecated |
| Lambda Dev | eppae4ae82... | N/A | ❌ Broken (VPC timeout) |

---

## 🔮 Future Considerations

### Potential Improvements
1. **Load Balancer**: Add ALB for high availability
2. **Auto Scaling**: ASG for handling traffic spikes
3. **Monitoring**: CloudWatch dashboards for EC2 metrics
4. **Backup**: Automated DynamoDB backups
5. **CI/CD**: GitHub Actions for EC2 deployment

### Migration Cleanup
1. **Remove Lambda**: Clean up unused Lambda functions
2. **Update Docs**: Reflect EC2-first architecture
3. **Simplify Config**: Single source of truth for environment configs
4. **Test Coverage**: Comprehensive EC2 deployment testing
