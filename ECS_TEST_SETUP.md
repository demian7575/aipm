# ECS Worker Gating Test Setup

## Issue

The ECS worker gating test failed with:
```
AccessDeniedException: User is not authorized to perform: ecs:DescribeClusters
```

## Solution

Add ECS read permissions to the EC2 instance role `EC2-ECR-Access`.

### Option 1: Attach AWS Managed Policy (Recommended)

```bash
aws iam attach-role-policy \
  --role-name EC2-ECR-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess \
  --region us-east-1
```

### Option 2: Add Inline Policy (Minimal Permissions)

```bash
aws iam put-role-policy \
  --role-name EC2-ECR-Access \
  --policy-name ECSTestAccess \
  --policy-document file://ecs-test-policy.json \
  --region us-east-1
```

The policy document `ecs-test-policy.json` has been created with minimal required permissions.

### After Adding Permissions

Run the test again:
```bash
./scripts/testing/test-ecs-worker-gating.sh
```

Expected output:
```
🧪 ECS Worker Gating Test
✅ Cluster active
✅ Task definition exists
✅ ECS worker test passed
```
