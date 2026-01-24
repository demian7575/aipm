# AIPM Configuration Guide

## Single Source of Truth

All environment configuration is centralized in `config/environments.yaml`. This file contains all IPs, ports, and resource names for both production and development environments.

## Configuration File Structure

```yaml
production:
  ec2_ip: "44.197.204.18"
  api_port: 4000
  semantic_api_port: 8083
  terminal_port: 8080
  s3_bucket: "aipm-static-hosting-demo"
  s3_url: "http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com"
  dynamodb_stories_table: "aipm-backend-prod-stories"
  dynamodb_tests_table: "aipm-backend-prod-acceptance-tests"
  dynamodb_prs_table: "aipm-backend-prod-prs"

development:
  ec2_ip: "44.222.168.46"
  api_port: 4000
  semantic_api_port: 8083
  terminal_port: 8080
  s3_bucket: "aipm-dev-frontend-hosting"
  s3_url: "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com"
  dynamodb_stories_table: "aipm-backend-dev-stories"
  dynamodb_tests_table: "aipm-backend-dev-acceptance-tests"
  dynamodb_prs_table: "aipm-backend-dev-prs"
```

## How Configuration is Used

### 1. Deployment Scripts

The `bin/deploy-prod` script loads configuration using:

```bash
source scripts/utilities/load-env-config.sh production
```

This exports environment variables that are used throughout deployment.

### 2. Backend Application

The backend reads environment variables set during deployment:
- `STORIES_TABLE`
- `ACCEPTANCE_TESTS_TABLE`
- `PRS_TABLE`
- `AWS_REGION`
- `SEMANTIC_API_URL`

### 3. Testing Scripts

Gating tests load configuration:

```bash
source scripts/utilities/load-env-config.sh production
./scripts/testing/run-structured-gating-tests.sh
```

## Updating Configuration

**To change IPs or ports:**

1. Edit `config/environments.yaml`
2. Update the relevant environment section
3. Redeploy: `./bin/deploy-prod prod` or `./bin/deploy-prod dev`

**Do NOT hardcode IPs in:**
- Deployment scripts
- Test scripts
- Documentation (except this file)

## Environment Files

Legacy `.env` files exist but should only contain:
- `ENVIRONMENT=production` or `ENVIRONMENT=development`
- `AWS_REGION=us-east-1`

All other values come from `config/environments.yaml`.

## Loading Configuration

Use the helper script to load configuration in any script:

```bash
#!/bin/bash
source scripts/utilities/load-env-config.sh production

# Now you have access to:
echo $EC2_IP
echo $API_BASE
echo $SEMANTIC_API_BASE
echo $DYNAMODB_STORIES_TABLE
```

## Available Variables

After loading config, these variables are available:

- `EC2_IP` - EC2 instance IP
- `API_PORT` - Backend API port
- `SEMANTIC_API_PORT` - Semantic API port
- `TERMINAL_PORT` - Terminal service port
- `S3_BUCKET` - Frontend S3 bucket name
- `S3_URL` - Frontend URL
- `DYNAMODB_STORIES_TABLE` - Stories table name
- `DYNAMODB_TESTS_TABLE` - Acceptance tests table name
- `DYNAMODB_PRS_TABLE` - PRs table name
- `API_BASE` - Full API URL (computed)
- `SEMANTIC_API_BASE` - Full Semantic API URL (computed)
- `TERMINAL_URL` - WebSocket terminal URL (computed)
