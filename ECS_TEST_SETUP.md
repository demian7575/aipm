# ECS Worker Gating Test Setup

## Issue

The ECS worker gating test fails with:
```
AccessDeniedException: User: arn:aws:sts::728378229251:assumed-role/EC2-ECR-Access/i-016241c7a18884e80 
is not authorized to perform: ecs:DescribeClusters
```

## Required Permissions

The `EC2-ECR-Access` IAM role needs the following permissions added:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    }
  ]
}
```

## How to Fix (Administrator Access Required)

### Option 1: AWS Console
1. Go to IAM → Roles → EC2-ECR-Access
2. Add inline policy or attach managed policy
3. Use the JSON above

### Option 2: AWS CLI (with admin credentials)
```bash
aws iam put-role-policy \
  --role-name EC2-ECR-Access \
  --policy-name ECSGatingTestPermissions \
  --policy-document file://ecs-test-permissions.json
```

### Option 3: Add to existing policy
If the role has a managed policy, add these actions to it:
- `ecs:DescribeClusters`
- `ecs:DescribeTaskDefinition`

## After Adding Permissions

Wait ~10 seconds for IAM propagation, then run:
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
