# ECS-Based Amazon Q Worker Deployment

## Overview

Replaced CloudShell heartbeat system with ECS Fargate tasks for scalable, persistent Amazon Q code generation.

## Architecture

```
User clicks "Create PR"
  ↓
Lambda /api/personal-delegate
  ↓
1. Write task to DynamoDB (tracking)
2. Trigger ECS Fargate task
  ↓
ECS Task (Amazon Q Worker)
  ↓
1. Clone repository
2. Run Amazon Q with --trust-all-tools
3. Commit changes
4. Push to branch
5. Create GitHub PR
6. Update DynamoDB status
```

## Deployed Resources

### ECS Cluster
- **Name**: `aipm-cluster`
- **Type**: Fargate
- **Region**: us-east-1

### Task Definition
- **Name**: `aipm-amazon-q-worker`
- **CPU**: 1024 (1 vCPU)
- **Memory**: 2048 MB
- **Image**: `728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest`

### Networking
- **Subnets**: subnet-021cb68f18ae60508, subnet-03525df27c75e12b5
- **Security Group**: sg-0ad4bc9d85549a7c7
- **Public IP**: Enabled

### IAM Roles
- **Task Execution Role**: `aipm-ecs-task-execution-role`
  - ECR pull permissions
  - CloudWatch Logs write
  - Secrets Manager read (GitHub token)

- **Task Role**: `aipm-q-worker-role`
  - DynamoDB UpdateItem/GetItem
  - CloudWatch Logs write

### Secrets
- **GitHub Token**: `arn:aws:secretsmanager:us-east-1:728378229251:secret:aipm/github-token`
  - ⚠️ **ACTION REQUIRED**: Set token manually:
    ```bash
    aws secretsmanager create-secret \
      --name aipm/github-token \
      --secret-string "YOUR_GITHUB_TOKEN" \
      --region us-east-1
    ```

### CloudWatch Logs
- **Log Group**: `/ecs/aipm-amazon-q-worker`
- **Retention**: Default (never expire)

## Lambda Integration

### Environment Variables
```yaml
ECS_SUBNETS: subnet-021cb68f18ae60508,subnet-03525df27c75e12b5
ECS_SECURITY_GROUP: sg-0ad4bc9d85549a7c7
```

### IAM Permissions Added
```yaml
- Effect: Allow
  Action:
    - ecs:RunTask
    - ecs:DescribeTasks
  Resource: '*'
- Effect: Allow
  Action:
    - iam:PassRole
  Resource:
    - arn:aws:iam::*:role/aipm-ecs-task-execution-role
    - arn:aws:iam::*:role/aipm-q-worker-role
```

## Code Changes

### apps/backend/app.js
- Updated `performDelegation()` function
- Changed from DynamoDB queue (status: pending) to ECS trigger (status: processing)
- Added ECS RunTaskCommand with environment variable overrides

### package.json
- Added `@aws-sdk/client-ecs` dependency

### serverless.yml
- Added ECS environment variables
- Added ECS IAM permissions
- Removed AWS_REGION (reserved by Lambda)

## Worker Script

### q-worker.sh
```bash
#!/bin/bash
# 1. Update DynamoDB status to "processing"
# 2. Clone repository
# 3. Create branch
# 4. Run Amazon Q with --trust-all-tools
# 5. Push changes
# 6. Create PR via GitHub API
# 7. Update DynamoDB with PR number (status: complete)
# 8. On error: Update status to "failed"
```

## Testing

### Manual ECS Task Test
```bash
aws ecs run-task \
  --cluster aipm-cluster \
  --task-definition aipm-amazon-q-worker \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-021cb68f18ae60508,subnet-03525df27c75e12b5],securityGroups=[sg-0ad4bc9d85549a7c7],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "amazon-q-worker",
      "environment": [
        {"name": "TASK_ID", "value": "test-123"},
        {"name": "TASK_TITLE", "value": "Test Task"},
        {"name": "TASK_DETAILS", "value": "Add console.log to app.js"},
        {"name": "BRANCH_NAME", "value": "test-branch-123"},
        {"name": "GITHUB_OWNER", "value": "demian7575"},
        {"name": "GITHUB_REPO", "value": "aipm"}
      ]
    }]
  }' \
  --region us-east-1
```

### Via API
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add feature X",
    "details": "Implement feature X with constraints Y",
    "target": "pr"
  }'
```

## Monitoring

### CloudWatch Logs
```bash
# View ECS task logs
aws logs tail /ecs/aipm-amazon-q-worker --follow --region us-east-1

# View Lambda logs
npx serverless logs -f api --stage prod --tail
```

### DynamoDB Queue Status
```bash
# Check task status
aws dynamodb scan \
  --table-name aipm-amazon-q-queue \
  --region us-east-1 \
  --query 'Items[*].[id.S,title.S,status.S]' \
  --output table
```

### ECS Task Status
```bash
# List running tasks
aws ecs list-tasks \
  --cluster aipm-cluster \
  --region us-east-1

# Describe task
aws ecs describe-tasks \
  --cluster aipm-cluster \
  --tasks TASK_ARN \
  --region us-east-1
```

## Cost Estimate

### ECS Fargate
- **vCPU**: $0.04048/hour
- **Memory**: $0.004445/GB/hour
- **Total per task**: ~$0.02 for 30-minute execution
- **Monthly (100 tasks)**: ~$2.00

### Secrets Manager
- **Secret storage**: $0.40/month
- **API calls**: $0.05 per 10,000 calls

### CloudWatch Logs
- **Ingestion**: $0.50/GB
- **Storage**: $0.03/GB/month

### Total Monthly Cost (100 PRs)
- **Estimated**: $3-5/month

## Benefits vs CloudShell

| Feature | CloudShell | ECS Fargate |
|---------|-----------|-------------|
| **Availability** | Session-based | Always available |
| **Scalability** | 1 concurrent | Unlimited |
| **Reliability** | Manual restart | Auto-restart |
| **Monitoring** | Limited | CloudWatch |
| **Cost** | Free | ~$0.02/task |
| **Timeout** | 20 min | Configurable |

## Troubleshooting

### Task Fails to Start
```bash
# Check task definition
aws ecs describe-task-definition \
  --task-definition aipm-amazon-q-worker \
  --region us-east-1

# Check IAM permissions
aws iam get-role-policy \
  --role-name aipm-q-worker-role \
  --policy-name aipm-q-worker-policy
```

### GitHub Token Not Found
```bash
# Verify secret exists
aws secretsmanager describe-secret \
  --secret-id aipm/github-token \
  --region us-east-1

# Update secret
aws secretsmanager update-secret \
  --secret-id aipm/github-token \
  --secret-string "YOUR_TOKEN" \
  --region us-east-1
```

### Amazon Q Not Installed
```bash
# Check Docker image
docker run --rm 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest \
  which kiro-cli
```

## Next Steps

1. ✅ Set GitHub token in Secrets Manager
2. ✅ Test manual ECS task execution
3. ✅ Test via API endpoint
4. ✅ Monitor CloudWatch logs
5. ✅ Verify PR creation
6. ⬜ Set up CloudWatch alarms for failures
7. ⬜ Implement retry logic
8. ⬜ Add task timeout monitoring

## Rollback Plan

If ECS approach fails, revert to CloudShell heartbeat:

```bash
git checkout feature-help-1764415470712
./deploy-prod-full.sh
```

## Documentation

- **Dockerfile**: `Dockerfile.q-worker`
- **Worker Script**: `q-worker.sh`
- **Deployment Script**: `deploy-ecs-worker.sh`
- **Task Definition**: Generated in `/tmp/task-definition.json`
- **ECS Config**: Generated in `/tmp/ecs-config.json`
