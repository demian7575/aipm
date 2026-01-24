# Centralized Environment Configuration

## Single Source of Truth

All environment configurations are defined in **`config/environments.yaml`**.

**To change Production or Development IPs, update only this file.**

## Usage in Scripts

```bash
#!/bin/bash
# Load production config
source scripts/utilities/load-env-config.sh prod

# Use variables
curl "$API_BASE/api/version"
ssh ec2-user@$EC2_IP "systemctl status aipm-backend"
```

## Usage in GitHub Actions

```yaml
- name: Load environment config
  run: |
    source scripts/utilities/load-env-config.sh prod
    echo "API_BASE=$API_BASE" >> $GITHUB_ENV
    echo "EC2_IP=$EC2_IP" >> $GITHUB_ENV

- name: Run tests
  run: |
    curl $API_BASE/api/health
```

## Available Variables

After sourcing `load-env-config.sh`:

- `$EC2_IP` - EC2 instance IP
- `$API_BASE` - Full API URL (http://IP:PORT)
- `$SEMANTIC_API_BASE` - Semantic API URL
- `$TERMINAL_URL` - WebSocket terminal URL
- `$S3_BUCKET` - S3 bucket name
- `$S3_URL` - S3 website URL
- `$DYNAMODB_STORIES_TABLE` - DynamoDB stories table
- `$DYNAMODB_TESTS_TABLE` - DynamoDB tests table
- `$DYNAMODB_PRS_TABLE` - DynamoDB PRs table

## Migration Guide

### Before (hardcoded):
```bash
API_BASE="http://3.92.96.67:4000"
```

### After (centralized):
```bash
source scripts/utilities/load-env-config.sh prod
# $API_BASE is now available
```

## Benefits

1. **Single update point** - Change IP in one file only
2. **Consistency** - All scripts use same values
3. **Environment switching** - Easy to switch between prod/dev
4. **Version controlled** - Configuration changes tracked in git
5. **Documentation** - Clear structure for all environments
