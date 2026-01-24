# AIPM Code Structure Investigation - December 2025

## 📁 Current Directory Structure

```
/repo/ebaejun/tools/aws/aipm/
├── apps/
│   ├── backend/           # Node.js backend application
│   │   ├── app.js         # Main Express server
│   │   ├── server.js      # Server entry point
│   │   ├── dynamodb.js    # DynamoDB operations
│   │   └── data/          # Local SQLite fallback
│   └── frontend/
│       └── public/        # Static frontend files
│           ├── index.html # Main HTML
│           ├── app.js     # Frontend JavaScript (255KB)
│           ├── styles.css # Styling
│           └── config.js  # Environment configuration
├── scripts/
│   ├── deployment/        # Deployment scripts
│   │   ├── deploy-dev-ec2.sh      # New EC2 deployment
│   │   ├── deploy-dev-full.sh     # Legacy Lambda deployment
│   │   └── deploy-prod-complete.sh # Production deployment
│   ├── kiro-api-server-v4.js      # Kiro API service
│   ├── terminal-server.js         # Terminal service
│   └── setup-dev-complete.sh      # Development setup
├── bin/
│   ├── deploy-prod -> ../scripts/deployment/deploy-prod-full.sh
│   └── deploy-dev  -> ../scripts/deployment/deploy-dev-ec2.sh
├── .github/workflows/     # GitHub Actions
├── docs/                  # Documentation
└── infrastructure/        # AWS CloudFormation/Terraform
```

## 🔧 Key Components

### Backend Application (`apps/backend/`)
- **app.js**: Express server with REST API endpoints
- **dynamodb.js**: DynamoDB operations and data mapping
- **server.js**: Server startup and configuration
- **Environment**: Node.js 18.x, runs on port 4000 (proxied via nginx)

### Frontend Application (`apps/frontend/public/`)
- **index.html**: Single-page application shell
- **app.js**: 255KB JavaScript application (no build process)
- **styles.css**: CSS styling
- **config.js**: Environment-specific configuration

### Services (`scripts/`)
- **kiro-api-server-v4.js**: Code generation API service
- **terminal-server.js**: WebSocket terminal service
- **Various test scripts**: Integration and health checks

### Deployment (`scripts/deployment/`)
- **deploy-dev-ec2.sh**: New EC2-based development deployment
- **deploy-dev-full.sh**: Legacy Lambda-based deployment
- **deploy-prod-complete.sh**: Production deployment script

## 🏗️ Architecture Evolution

### Previous Architecture (Lambda)
```
Frontend (S3) → API Gateway → Lambda → DynamoDB
                            ↓
                         EC2 (Kiro services only)
```

### Current Architecture (Dual EC2)
```
Frontend (S3) → EC2 Backend → DynamoDB
                ├── Backend API (port 80)
                ├── Kiro API (port 8081)
                └── Terminal (port 8080)
```

## 📊 Code Metrics

| Component | Size | Language | Purpose |
|-----------|------|----------|---------|
| Frontend JS | 255KB | JavaScript | Single-page application |
| Backend API | ~50KB | Node.js | REST API server |
| Kiro API | ~47KB | Node.js | Code generation service |
| Terminal Server | ~4KB | Node.js | WebSocket terminal |
| Deployment Scripts | ~20KB | Bash | Infrastructure automation |

## 🔄 Configuration Management

### Environment Configurations
```javascript
// Production (3.92.96.67)
window.CONFIG = {
  API_BASE_URL: 'http://3.92.96.67',
  ENVIRONMENT: 'production',
  storiesTable: 'aipm-backend-prod-stories'
}

// Development (44.222.168.46)  
window.CONFIG = {
  API_BASE_URL: 'http://44.222.168.46',
  ENVIRONMENT: 'development',
  storiesTable: 'aipm-backend-dev-stories'
}
```

### Service Configuration
- **systemd services**: Managed via systemctl
- **nginx proxy**: Routes port 80 to Node.js port 4000
- **Environment variables**: Set via systemd service files

## 🚀 Deployment Flow

### Production Deployment
1. **Build**: Copy apps/ to dist/
2. **Deploy Backend**: Update EC2 services
3. **Deploy Frontend**: Sync to S3
4. **Health Check**: Verify all endpoints

### Development Deployment
1. **Mirror Data**: Copy production → development DynamoDB
2. **Deploy Backend**: Update development EC2 services
3. **Deploy Frontend**: Sync to development S3
4. **Verify**: Check environment isolation

## 📋 Service Dependencies

### Production EC2 (3.92.96.67)
- **aipm-main-backend**: Main API service
- **kiro-api-v4**: Code generation
- **aipm-terminal-server**: WebSocket terminal
- **nginx**: Reverse proxy

### Development EC2 (44.222.168.46)
- **aipm-dev-backend**: Development API service
- **kiro-api-dev**: Development code generation
- **aipm-terminal-server-dev**: Development terminal
- **nginx**: Reverse proxy

## 🔍 Recent Changes

### Fixed Issues
1. **Modal JavaScript Error**: Fixed dialog API compatibility
2. **Configuration Conflicts**: Separated prod/dev configs
3. **Data Synchronization**: Implemented prod→dev mirroring
4. **Environment Isolation**: Separate EC2 instances

### Architecture Migration
- **From**: Lambda + API Gateway architecture
- **To**: Dual EC2 architecture
- **Benefits**: Better performance, no cold starts, isolated environments
- **Status**: Complete, Lambda APIs deprecated but still deployed
