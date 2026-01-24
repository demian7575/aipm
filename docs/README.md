# Documentation Update - January 24, 2026

## Recent Changes

### Configuration Centralization
- All environment configuration moved to `config/environments.yaml`
- Single source of truth for IPs, ports, and resource names
- See [CONFIGURATION.md](CONFIGURATION.md) for details

### Repository Cleanup
- Removed ~620 outdated files
- Cleaned up conversation archives
- Removed Lambda deployment artifacts (using EC2 only)
- Removed sample data scripts

### API Architecture
- Using Semantic API (port 8083) for AI features
- Session Pool (port 8082) manages Kiro CLI sessions
- Backend API on port 4000

### Current Endpoints

**Production:**
- Frontend: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- API: http://44.197.204.18:4000
- Semantic API: http://44.197.204.18:8083

**Development:**
- Frontend: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/
- API: http://44.222.168.46:4000
- Semantic API: http://44.222.168.46:8083

## Outdated Documentation

The following documents reference old architecture (KIRO API, old IPs):
- Most files in `docs/` with "KIRO_API" in the name
- Files referencing IP `44.220.45.57` (old, no longer valid)

These are kept for historical reference but should not be used for current development.

## Current Documentation

**Start here:**
- [README.md](../README.md) - Main documentation
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration guide
- [DevelopmentBackground.md](DevelopmentBackground.md) - Development guide (needs update)

**Deployment:**
- Use `./bin/deploy-prod prod` or `./bin/deploy-prod dev`
- Configuration in `config/environments.yaml`

**Testing:**
- Gating tests: `./scripts/testing/run-structured-gating-tests.sh`
- Load config first: `source scripts/utilities/load-env-config.sh production`
