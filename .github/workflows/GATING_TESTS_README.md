# GitHub Workflow Gating Tests

## Overview

Phase 1 and Phase 2 are configured as **deployment gates** in the GitHub workflow. Both must pass for deployment approval.

## Gating Structure

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Security & Data Safety (BLOCKING)            │
│  - Security validation                                  │
│  - Database integrity                                   │
│  - Deployment safety                                    │
└─────────────────────────────────────────────────────────┘
                         ↓ (must pass)
┌─────────────────────────────────────────────────────────┐
│  Phase 2: Complete E2E Workflow (BLOCKING)              │
│  - Story Draft Generation (AI)                          │
│  - Acceptance Test Draft (AI)                           │
│  - GitHub Integration (Mock)                            │
│  - Code Generation (Real Semantic API)                  │
│  - Story Status Workflow                                │
│  - Data Consistency                                     │
│  - Cascade Delete                                       │
└─────────────────────────────────────────────────────────┘
                         ↓ (must pass)
┌─────────────────────────────────────────────────────────┐
│  Phase 3: Infrastructure & Monitoring (INFORMATIONAL)   │
│  - Network infrastructure                               │
│  - Monitoring integration                               │
│  - System integration                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
              ✅ DEPLOYMENT APPROVED
```

## Phase Configuration

### Phase 1: Security & Data Safety
- **Priority**: 🔴 Critical
- **Impact**: BLOCKS deployment
- **Duration**: ~8 seconds
- **Tests**: 12 checks

### Phase 2: Complete E2E Workflow
- **Priority**: 🔴 Critical
- **Impact**: BLOCKS deployment
- **Duration**: ~54 seconds
- **Tests**: 8 steps
- **Configuration**:
  - Database: Dev (safe)
  - GitHub: Mock (no real PRs)
  - Kiro: Real (Semantic API)

### Phase 3: Infrastructure & Monitoring
- **Priority**: 🟢 Medium
- **Impact**: Informational only
- **Duration**: Variable
- **Tests**: Infrastructure checks

## Deployment Decision Matrix

| Phase 1 | Phase 2 | Phase 3 | Result |
|---------|---------|---------|--------|
| ✅ Pass | ✅ Pass | ✅ Pass | ✅ **APPROVED** - All systems validated |
| ✅ Pass | ✅ Pass | ❌ Fail | ✅ **APPROVED** - Phase 3 is informational |
| ✅ Pass | ❌ Fail | Any | ❌ **BLOCKED** - E2E workflow issues |
| ❌ Fail | Any | Any | ❌ **BLOCKED** - Security/data issues |

## Workflow Triggers

### Automatic
- Push to `main` branch
- Pull request to `main` branch

### Manual
```bash
# Run all phases
gh workflow run workflow-gating-tests.yml

# Run specific phase
gh workflow run workflow-gating-tests.yml -f phase=1
gh workflow run workflow-gating-tests.yml -f phase=2
gh workflow run workflow-gating-tests.yml -f phase=3
```

## Environment Variables

Phase 2 uses these environment variables:

```yaml
env:
  TEST_DB_ENV: dev                    # Use dev DynamoDB (safe)
  TEST_USE_MOCK_GITHUB: true          # Mock GitHub (no real PRs)
  TEST_SSH_HOST: 3.92.96.67           # EC2 host for Semantic API
  USE_KIRO_MOCK: false                # Use real Semantic API
```

## Required Secrets

The workflow requires these GitHub secrets:

- `AWS_ACCESS_KEY_ID` - AWS credentials for DynamoDB access
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `EC2_SSH_KEY` - SSH private key for EC2 access
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Test Report

After each run, a comprehensive test report is generated:

- Posted as PR comment (for pull requests)
- Uploaded as workflow artifact
- Includes:
  - Test results summary
  - Overall assessment
  - Test coverage details
  - Deployment decision

## Example Report

```markdown
# AIPM Structured Gating Tests Report

**Date:** 2026-01-21 09:00:00 UTC
**Commit:** abc123
**Branch:** main

## Test Results Summary

| Phase | Priority | Status | Impact |
|-------|----------|--------|---------|
| Phase 1: Security & Data Safety | 🔴 Critical | success | Deployment Approved |
| Phase 2: Complete E2E Workflow | 🔴 Critical | success | E2E Validated |
| Phase 3: Infrastructure | 🟢 Medium | success | Infrastructure Healthy |

## Overall Assessment

✅ **DEPLOYMENT APPROVED**

Critical security, data safety, and E2E workflow requirements met.
✅ Infrastructure and monitoring fully validated.
```

## Benefits

### 1. Comprehensive Validation
- Security and data safety (Phase 1)
- Complete user workflow (Phase 2)
- Infrastructure health (Phase 3)

### 2. Safe Testing
- Uses dev DynamoDB (no production data risk)
- Mock GitHub (no real PRs created)
- Real Semantic API (validates AI features)

### 3. Fast Feedback
- Phase 1: ~8 seconds
- Phase 2: ~54 seconds
- Total: ~62 seconds for critical gates

### 4. Clear Decision Making
- Binary pass/fail for deployment
- Detailed test reports
- Automatic PR comments

## Troubleshooting

### Phase 1 Failures
- Check AWS credentials
- Verify DynamoDB table access
- Review security configuration

### Phase 2 Failures
- Verify EC2 SSH access
- Check Semantic API health
- Review test logs in workflow artifacts

### Phase 3 Failures
- Informational only - does not block deployment
- Review infrastructure issues
- Consider addressing before next deployment

## Local Testing

Test the same workflow locally:

```bash
# Phase 1
./scripts/testing/phase1-security-data-safety.sh

# Phase 2
export TEST_DB_ENV="dev"
export TEST_USE_MOCK_GITHUB="true"
export TEST_SSH_HOST="3.92.96.67"
export USE_KIRO_MOCK="false"
./scripts/testing/phase2-optimized.sh
```

## Monitoring

View workflow runs:
- GitHub Actions tab
- https://github.com/demian7575/aipm/actions/workflows/workflow-gating-tests.yml

## Next Steps

1. ✅ Phase 1 and 2 configured as deployment gates
2. ✅ Using optimized Phase 2 test (54s)
3. ✅ Safe configuration (dev DB, mock GitHub)
4. ⏳ Monitor workflow runs
5. ⏳ Adjust thresholds based on results
