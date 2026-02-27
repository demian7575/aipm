---
inclusion: always
---

# Project Status & Progress

**Last Updated**: 2026-02-28 00:51 KST

## Recent Changes (Today)
- **MAJOR**: Implemented API Gateway Proxy architecture
  - Created API Gateway `aipm-api-proxy` (kx0u99e7o0.execute-api.us-east-1.amazonaws.com)
  - All frontend requests now go through Lambda proxy
  - EC2 auto-starts on first request via Lambda
  - No hardcoded IPs in frontend anymore
  - Single source of truth: Lambda `aipm-ec2-proxy`
  - Lambda supports both prod/dev environments via `?env=` parameter
- **Fixed**: X-Use-Dev-Tables header now respected in POST /api/stories
  - Root cause: project-specific tables were overriding dev/prod selection
  - Solution: force project=null when useDevTables=true
  - All CRUD operations now correctly use dev tables when header is set
- **Fixed**: Test script issues
  - Added AIPM_ENV support for API Gateway routing
  - Fixed SEMANTIC_API_BASE to use direct EC2 (internal service)
  - Replaced hardcoded S3 URLs with $S3_URL variable
  - Fixed Test 4 to check for .id instead of .success
- **Cleaned up**: Removed leftover code and fixed inconsistencies
  - Removed unused EC2Manager code from earlier attempts
  - Fixed all sed-replaced URLs to use proper quoting
  - Consistent header checking across all endpoints

## Current Status
- ✅ API Gateway Proxy fully operational
- ✅ Phase 1: All tests passing
- ✅ Phase 2: All 12 tests passing
- ✅ Phase 4: 43/44 tests passing (1 pre-existing failure)
- ✅ GitHub workflow uses API Gateway for main API
- ✅ All services operational

## Architecture
```
Frontend (S3) → API Gateway → Lambda (aipm-ec2-proxy) → EC2 Backend
                                  ↓
                            Auto-starts EC2 if stopped
                            Routes to correct instance (prod/dev)
                            Proxies to port 4000 or 8083

Tests → API Gateway (main API) + Direct EC2:8083 (semantic API)
```

## Active Services
- ✅ Backend API (port 4000) - healthy
- ✅ Semantic API (port 8083) - healthy  
- ✅ Kiro Session Pool HTTP (port 8082) - 2 sessions
- ✅ Kiro Wrapper @1 (port 9001) - bash → kiro-cli
- ✅ Kiro Wrapper @2 (port 9002) - bash → kiro-cli
- ✅ API Gateway (kx0u99e7o0.execute-api.us-east-1.amazonaws.com)
- ✅ Lambda (aipm-ec2-proxy) - auto-start + proxy

## Key Fixes Applied
- **API Gateway Proxy**: Eliminates hardcoded IPs, enables auto-start
- **X-Use-Dev-Tables**: Now correctly routes to dev tables for all operations
- **Test Scripts**: Support both direct EC2 and API Gateway URLs
- **URL Construction**: Proper query parameter handling (?env=prod)
- **Project Override**: Disabled when using dev tables

## Known Issues
- None currently

## Next Steps
- Monitor API Gateway proxy in production
- Continue feature development

## Completed Cleanup (Phase 4)
- ✅ Removed ec2-manager.js and S3 config update mechanisms
- ✅ Deleted S3 bucket aipm-ec2-config
- ✅ Deleted unused Lambda function refresh-service
- ✅ Removed systemd service aipm-update-s3-config from EC2
- ✅ Simplified frontend initialization
- ✅ Cleaned up 383 lines of obsolete code

## Architecture Status
- Dual EC2 setup (prod: 3.87.129.233, dev: stopped)
- DynamoDB for data storage (prod/dev tables working correctly)
- S3 for static hosting
- API Gateway for dynamic IP resolution
- Lambda for EC2 auto-start and request proxying
- GitHub Actions for CI/CD

## EC2 Instance Status
- **Prod Instance** (i-09971cca92b9bf3a9): Active on 3.87.129.233
  - All services operational
  - Auto-starts via Lambda when stopped
- **Dev Instance** (i-08c78da25af47b3cb): Stopped
  - Auto-starts via Lambda when needed
