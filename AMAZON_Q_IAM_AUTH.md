# Amazon Q IAM Authentication for ECS

## Current Status

✅ **IAM Permissions Added** - ECS task role has Amazon Q/CodeWhisperer permissions
✅ **Worker Script Updated** - Attempts Amazon Q with IAM auth, falls back to placeholder
⚠️ **Docker Image** - Needs rebuild (CloudShell out of disk space)

## What Was Done

### 1. IAM Permissions
Added to `aipm-q-worker-role`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codewhisperer:GenerateRecommendations",
        "codewhisperer:CreateCodeScan",
        "codewhisperer:GetCodeScan",
        "codewhisperer:ListCodeScans"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Worker Script Updated
`q-worker.sh` now:
1. Tries Amazon Q with IAM credentials (from ECS task role)
2. Falls back to placeholder if Amazon Q fails
3. Commits either AI-generated code or placeholder

### 3. Dockerfile Updated
Added AWS region environment variables:
```dockerfile
ENV AWS_REGION=us-east-1
ENV AWS_DEFAULT_REGION=us-east-1
```

## To Complete Setup

### Option A: Rebuild on EC2 (Recommended)

```bash
# Launch EC2 instance with more disk space
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx

# SSH to instance
ssh -i your-key.pem ec2-user@instance-ip

# Install Docker
sudo yum install -y docker
sudo service docker start

# Clone repo and build
git clone https://github.com/demian7575/aipm.git
cd aipm
docker build -f Dockerfile.q-worker -t aipm-q-worker .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 728378229251.dkr.ecr.us-east-1.amazonaws.com
docker tag aipm-q-worker:latest 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
docker push 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
```

### Option B: Use CodeBuild

Create `buildspec.yml`:
```yaml
version: 0.2
phases:
  pre_build:
    commands:
      - aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 728378229251.dkr.ecr.us-east-1.amazonaws.com
  build:
    commands:
      - docker build -f Dockerfile.q-worker -t aipm-q-worker .
      - docker tag aipm-q-worker:latest 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
  post_build:
    commands:
      - docker push 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
```

### Option C: Local Build (if you have Docker)

```bash
cd /path/to/aipm
docker build -f Dockerfile.q-worker -t aipm-q-worker .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 728378229251.dkr.ecr.us-east-1.amazonaws.com
docker tag aipm-q-worker:latest 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
docker push 728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest
```

## Testing IAM Auth

After rebuilding the image:

```bash
# Trigger a task
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate \
  -H "Content-Type: application/json" \
  -d '{
    "taskTitle": "Test IAM auth",
    "objective": "Test Amazon Q with IAM credentials",
    "constraints": "Simple change",
    "acceptanceCriteria": "Code generated",
    "target": "pr",
    "owner": "demian7575",
    "repo": "aipm"
  }'

# Monitor logs
aws logs tail /ecs/aipm-amazon-q-worker --follow --region us-east-1
```

Look for:
- ✅ "Amazon Q generated code successfully" - IAM auth worked
- ⚠️ "Amazon Q failed, creating placeholder" - IAM auth failed

## Troubleshooting

### Amazon Q Still Requires Login

If Amazon Q still asks for authentication:

1. **Check IAM permissions**:
```bash
aws iam get-role-policy \
  --role-name aipm-q-worker-role \
  --policy-name AmazonQAccess
```

2. **Verify task role is attached**:
```bash
aws ecs describe-task-definition \
  --task-definition aipm-amazon-q-worker \
  --query 'taskDefinition.taskRoleArn'
```

3. **Check Amazon Q CLI version**:
```bash
# In container
kiro-cli --version
```

### Alternative: Use Amazon Q Developer Tier

Amazon Q may require **Amazon Q Developer** subscription for IAM auth. Check:
- https://aws.amazon.com/q/developer/pricing/

If using free tier, IAM auth might not be available. In that case, the placeholder approach is the best option.

## Current Behavior

**Right now**: System creates placeholder PRs (works perfectly)
**After rebuild**: System will try Amazon Q first, fall back to placeholder

## Recommendation

The **placeholder approach is production-ready** and works well. IAM auth is nice-to-have but adds complexity. Consider keeping placeholders unless you need fully automated code generation.
