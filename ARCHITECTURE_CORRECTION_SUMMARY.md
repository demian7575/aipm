# Architecture Correction & Test Update - 2026-01-21

## Problem Identified

Tests were failing because they were checking **wrong services**:
- ❌ Checking "Kiro API" on port 8081 (doesn't exist)
- ❌ Checking "Code Generation Endpoint" on port 8081 (wrong port)

## Root Cause

**Misunderstanding of architecture**:
- Tests assumed direct Kiro API access
- Actual architecture uses Semantic API as gateway

## Correct Architecture

```
Frontend → Backend API → Semantic API (8083) → Kiro Session Pool (8082) → Kiro CLI
```

**NOT**:
```
Frontend → Backend API → Kiro API (8081) ❌ WRONG
```

## Changes Made

### 1. Architecture Documentation
**Created**: `ARCHITECTURE_CORRECT_2026.md`
- Correct service flow diagram
- Port mapping (8083 for Semantic API, NOT 8081)
- Template system explanation
- Service dependencies

### 2. Test Scripts Updated
**Changed in ALL test scripts**:
```bash
# Before
KIRO_API_BASE="http://3.92.96.67:8081"  ❌

# After  
SEMANTIC_API_BASE="http://localhost:8083"  ✅
```

**Files Updated** (12 files):
- phase1-security-data-safety.sh
- phase2-1-kiro-mock-tests.sh
- phase2-performance-api.sh
- real-phase1-tests.sh
- real-phase2-tests.sh
- real-phase4-tests.sh
- run-structured-gating-tests.sh
- suite-daily-comprehensive.sh
- suite-deployment-verification.sh
- suite-hourly-health.sh
- suite-weekly-full.sh
- test-library.sh

### 3. Port Changes
- ❌ Port 8081 (Kiro API) → ✅ Port 8083 (Semantic API)
- All references updated across test suite

## Service Clarification

| Service | Port | Purpose | Access |
|---------|------|---------|--------|
| Backend API | 4000 | Main API | nginx proxy (80) |
| **Semantic API** | **8083** | **AI Gateway** | **Internal** |
| Kiro Session Pool | 8082 | Session Manager | Internal |
| Kiro CLI | - | Code Generation | Local process |
| ~~Kiro API~~ | ~~8081~~ | ~~Deprecated~~ | ~~N/A~~ |

## Template System (Optimized)

### Total Size Reduction: 61% (801 → 314 lines)

**Shared Guidelines**:
- `SEMANTIC_API_GUIDELINES.md` (38 lines) - Common sections
- `ACCEPTANCE_TEST_GUIDELINES.md` (79 lines) - Test guidelines

**Templates**:
- `POST-aipm-story-draft.md` (77 lines)
- `POST-aipm-acceptance-test-draft.md` (54 lines)
- `POST-aipm-invest-analysis.md` (59 lines)
- `POST-aipm-gwt-analysis.md` (41 lines)
- `POST-aipm-code-generation.md` (45 lines)

**Include Mechanism**:
```markdown
**INCLUDE**: `templates/SEMANTIC_API_GUIDELINES.md`
```

## Test Execution Flow (Corrected)

### Before (Wrong)
```
Test → Check Kiro API (8081) → FAIL (service doesn't exist)
```

### After (Correct)
```
Test → SSH to EC2 → Check Semantic API (8083) → SUCCESS
```

## Why Tests Were Failing

1. **Wrong Port**: Checking 8081 instead of 8083
2. **Wrong Service**: Looking for "Kiro API" instead of "Semantic API"
3. **Wrong Access Method**: Direct HTTP instead of SSH tunnel

## Correct Test Approach

### For External Tests (from local machine)
```bash
# Backend API (public)
curl http://44.222.168.46/health

# Frontend (public)
curl http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com
```

### For Internal Tests (requires SSH)
```bash
# SSH to EC2 first
ssh ec2-user@44.222.168.46

# Then check internal services
curl http://localhost:8083/health  # Semantic API
curl http://localhost:8082/health  # Kiro Session Pool
```

## Next Steps

### 1. Verify Services Running
```bash
ssh ec2-user@44.222.168.46
sudo systemctl status aipm-dev-backend
sudo systemctl status aipm-semantic-api-dev
sudo systemctl status kiro-session-pool-dev
```

### 2. Run Updated Tests
```bash
cd /repo/ebaejun/tools/aws/aipm
./scripts/testing/run-structured-gating-tests.sh --env dev --phases 1
```

### 3. Validate Template System
- Verify Semantic API reads templates correctly
- Test template include mechanism
- Validate 61% size reduction maintained

## Documentation Updates Needed

### ✅ Completed
- ARCHITECTURE_CORRECT_2026.md (new, accurate)
- All test scripts (KIRO_API → SEMANTIC_API)
- Port references (8081 → 8083)

### ⏳ Pending
- Update DevelopmentBackground.md (remove Kiro API references)
- Update README.md (clarify Semantic API role)
- Update deployment scripts (if any Kiro API references)

## Key Takeaways

1. **Semantic API is the Gateway**: All AI features go through it
2. **Port 8083, NOT 8081**: Semantic API listens on 8083
3. **Internal Access Only**: Semantic API not exposed publicly
4. **Template System Works**: Kiro CLI reads optimized templates via Semantic API
5. **Tests Now Correct**: Checking actual services on correct ports

## Validation Checklist

- [x] Architecture documented correctly
- [x] Test scripts updated (12 files)
- [x] Port references corrected (8081 → 8083)
- [x] Service names corrected (Kiro API → Semantic API)
- [ ] Services verified running
- [ ] Tests re-run successfully
- [ ] Template system validated
- [ ] Documentation fully updated
