# AIPM Architecture & Workflow Update - December 2025

**Investigation Date:** 2025-12-26  
**Status:** Current Production Architecture Analysis  
**Purpose:** Document actual deployed architecture vs documented architecture

---

## 🏗️ Current Production Architecture

### Frontend Layer
```
S3 Static Hosting
├── Production: aipm-static-hosting-demo (s3-website-us-east-1.amazonaws.com)
├── Development: aipm-dev-frontend-hosting (s3-website-us-east-1.amazonaws.com)
└── Vanilla JS + CSS (no build process)
```

### Backend Layer - Serverless
```
AWS Lambda + API Gateway + DynamoDB
├── Production Stack: aipm-backend-prod
│   ├── Functions: api, getStories, getStory, createStory, healthCheck
│   ├── API Gateway: wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
│   └── Tables: aipm-backend-prod-stories, aipm-backend-prod-acceptance-tests
├── Development Stack: aipm-backend-dev
│   ├── Functions: api
│   ├── API Gateway: dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev
│   └── Tables: aipm-backend-dev-stories, aipm-backend-dev-acceptance-tests
└── Runtime: Node.js 18.x, 1024MB memory, 30s timeout
```

### Code Generation Layer - EC2
```
EC2 Instance (44.220.45.57)
├── Terminal Server: Port 8080 (Worker Pool)
├── Kiro API Server: Port 8081 (V4 - Direct Post)
├── Queue Manager: DynamoDB-based async processing
└── Services: systemd managed (aipm-terminal-server, kiro-api-server)
```

### Data Layer
```
DynamoDB Tables
├── aipm-backend-prod-stories (Production stories)
├── aipm-backend-prod-acceptance-tests (Production tests)
├── aipm-backend-dev-stories (Development stories)
├── aipm-backend-dev-acceptance-tests (Development tests)
└── aipm-amazon-q-queue (Code generation queue)
```

---

## 🔄 Current Workflow Analysis

### 1. User Story Management
```
Frontend (S3) → API Gateway → Lambda → DynamoDB
```
- **Create/Read/Update/Delete** stories via REST API
- **Hierarchical structure** with parent-child relationships
- **INVEST validation** with ChatGPT integration
- **Status tracking** (Draft → Ready → In Progress → Done)

### 2. Code Generation Workflow
```
User Request → Lambda → EC2 Queue → Kiro CLI → GitHub PR
```

**Detailed Flow:**
1. User clicks "Generate Code & PR" in frontend
2. Lambda creates GitHub branch and PR with TASK.md
3. Lambda triggers EC2 terminal server (fire-and-forget)
4. EC2 worker pool processes request with Kiro CLI
5. Generated code committed and pushed to PR branch
6. PR updated with implementation

**Timing:**
- User feedback: ~2 seconds (immediate PR creation)
- Code generation: 30 seconds - 10 minutes (async)

### 3. Deployment Workflow
```
Feature Branch → Dev Testing → User Approval → Production
```

**Commands:**
- `./bin/deploy-dev` - Deploy to development environment
- `./bin/deploy-prod` - Deploy to production environment
- `./bin/startup` - Environment health check

---

## 📊 Architecture Evolution

### Current State (December 2025)
- ✅ **Serverless Backend**: Lambda + API Gateway + DynamoDB
- ✅ **Static Frontend**: S3 hosting with CloudFront-like caching
- ✅ **EC2 Code Generation**: Persistent Kiro CLI workers
- ✅ **Async Processing**: Queue-based code generation
- ✅ **Dual Environment**: Separate dev/prod stacks

### Key Improvements Since Documentation
1. **Microservices Architecture**: Individual Lambda functions per operation
2. **Native DynamoDB**: Direct AWS SDK usage (no SQLite compatibility layer)
3. **Kiro API V4**: Direct POST architecture with callback URLs
4. **Queue Management**: DynamoDB-based async task processing
5. **Health Monitoring**: Comprehensive service health checks

---

## 🔧 Technical Implementation Details

### Backend Architecture
```javascript
// Current structure in apps/backend/
├── app.js              // Main monolithic handler (238KB)
├── microservices.js    // Individual function handlers
├── native-dynamodb.js  // Direct DynamoDB operations
├── lambda-handler.js   // Lambda entry points
└── dynamodb.js         // Legacy compatibility layer
```

### Serverless Configuration
```yaml
# serverless.yml
service: aipm-backend
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'prod'}
  memorySize: 1024
  timeout: 30
```

### EC2 Services
```bash
# Active systemd services
├── aipm-terminal-server.service  # Worker pool on port 8080
├── kiro-api-server.service      # Kiro API on port 8081
└── Auto-restart on failure
```

---

## 🚨 Critical Findings

### 1. Architecture Drift
- **Documentation shows**: SQLite + JSON fallback
- **Reality**: Native DynamoDB with no SQLite
- **Impact**: Documentation misleading for new developers

### 2. Code Duplication
- **Multiple DynamoDB implementations**: `dynamodb.js`, `native-dynamodb.js`, `microservices.js`
- **Monolithic app.js**: 238KB file handling multiple concerns
- **Impact**: Maintenance complexity, potential inconsistencies

### 3. Deployment Complexity
- **Multiple deployment paths**: Full stack, backend-only, frontend-only
- **EC2 dependency**: Manual SSH deployment for code generation
- **Impact**: Deployment failures if EC2 unavailable

### 4. Kiro Integration Evolution
- **V1**: Direct CLI calls (too slow)
- **V2**: Queue-based processing
- **V3**: JSON contract architecture
- **V4**: Direct POST with callbacks
- **Impact**: Multiple versions coexisting, unclear which is active

---

## 📋 Recommended Actions

### Immediate (High Priority)
1. **Update Documentation**
   - Remove SQLite references
   - Document actual DynamoDB architecture
   - Update API endpoints and table names

2. **Consolidate DynamoDB Code**
   - Standardize on `native-dynamodb.js`
   - Remove legacy `dynamodb.js`
   - Refactor microservices to use single data layer

3. **Clarify Kiro Architecture**
   - Document which Kiro version is production
   - Remove unused Kiro implementations
   - Update workflow documentation

### Medium Term (Next Sprint)
1. **Refactor Backend**
   - Split monolithic `app.js` into focused modules
   - Implement consistent error handling
   - Add comprehensive logging

2. **Improve Deployment**
   - Add deployment health checks
   - Implement rollback procedures
   - Document EC2 service management

3. **Enhance Monitoring**
   - Add CloudWatch dashboards
   - Implement alerting for service failures
   - Create operational runbooks

### Long Term (Next Quarter)
1. **Containerize EC2 Services**
   - Move from systemd to Docker/ECS
   - Implement auto-scaling
   - Add load balancing

2. **API Versioning**
   - Implement proper API versioning
   - Add backward compatibility
   - Document breaking changes

3. **Infrastructure as Code**
   - Convert manual EC2 setup to CloudFormation
   - Implement GitOps deployment
   - Add environment parity checks

---

## 🎯 Updated Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Code Gen       │
│   (S3 Static)   │    │  (Serverless)   │    │  (EC2)          │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Vanilla JS    │───▶│ • API Gateway   │───▶│ • Terminal Srv  │
│ • CSS Styling   │    │ • Lambda Funcs  │    │ • Kiro API V4   │
│ • Config Files  │    │ • DynamoDB      │    │ • Worker Pool   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ CloudFront CDN  │    │ CloudWatch      │    │ GitHub API      │
│ (Implicit)      │    │ Logs & Metrics  │    │ PR Management   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📚 Updated Quick Reference

### Production URLs
- **Frontend**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **API**: https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod
- **Terminal Server**: http://44.220.45.57:8080/health
- **Kiro API**: http://44.220.45.57:8081/health

### Development URLs
- **Frontend**: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- **API**: https://dka9vov9vg.execute-api.us-east-1.amazonaws.com/dev

### Key Commands
```bash
# Environment health
./bin/startup

# Deploy to development
./bin/deploy-dev

# Deploy to production
./bin/deploy-prod

# Check EC2 services
ssh ec2-user@44.220.45.57 'sudo systemctl status aipm-terminal-server'
ssh ec2-user@44.220.45.57 'sudo systemctl status kiro-api-server'
```

### DynamoDB Tables
```
Production:
├── aipm-backend-prod-stories
├── aipm-backend-prod-acceptance-tests
└── aipm-amazon-q-queue

Development:
├── aipm-backend-dev-stories
└── aipm-backend-dev-acceptance-tests
```

---

## 🔍 Next Steps

1. **Validate Findings**: Review with team to confirm architecture understanding
2. **Prioritize Updates**: Determine which recommendations to implement first
3. **Update Documentation**: Begin with critical documentation fixes
4. **Plan Refactoring**: Create detailed implementation plan for code consolidation
5. **Implement Monitoring**: Add observability to track system health

---

**Status**: ✅ Investigation Complete  
**Next Review**: After implementing immediate recommendations  
**Owner**: Development Team
