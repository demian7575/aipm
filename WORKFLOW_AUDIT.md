# GitHub Workflows Audit - Issues Found

## 1. workflow-gating-tests.yml
✅ **Fixed** - Now uses centralized config
- ❌ Removed: Unused SSH setup step (phase6 doesn't use SSH)
- ❌ Removed: Unused mock variables (TEST_USE_MOCK_GITHUB, USE_KIRO_MOCK, TEST_SSH_HOST)

## 2. deploy-to-prod.yml
❌ **Needs Fix** - Hardcoded IPs:
- Line 249: `http://44.220.45.57` (old IP, should be 44.197.204.18)
- Line 250: `http://44.220.45.57:8081` (old IP and wrong port)
- Should use centralized config from environments.yaml

## 3. deploy-pr-to-dev.yml  
❌ **Needs Fix** - Hardcoded IP:
- Line 282: `http://44.222.168.46:4000` (should use centralized config)

## Recommendations

### Remove SSH Setup from workflow-gating-tests.yml
Phase 6 doesn't use SSH, so this step is unnecessary.

### Update deploy-to-prod.yml
Replace hardcoded IPs with config loading:
```yaml
- name: Load environment configuration
  run: |
    source scripts/utilities/load-env-config.sh production
    echo "API_BASE=$API_BASE" >> $GITHUB_ENV
```

### Update deploy-pr-to-dev.yml
Replace hardcoded IP with config loading:
```yaml
- name: Load environment configuration
  run: |
    source scripts/utilities/load-env-config.sh development
    echo "API_BASE=$API_BASE" >> $GITHUB_ENV
```
