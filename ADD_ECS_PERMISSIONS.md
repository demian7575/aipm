# Add ECS Permissions to EC2 Role

The ECS worker gating test requires ECS read permissions. Add the following policy to the `EC2-ECR-Access` IAM role:

## Option 1: AWS Console

1. Go to IAM Console → Roles → EC2-ECR-Access
2. Click "Add permissions" → "Create inline policy"
3. Use JSON editor and paste the policy from `ecs-read-policy.json`
4. Name it: `ECSReadAccess`
5. Click "Create policy"

## Option 2: AWS CLI (from a machine with IAM permissions)

```bash
aws iam put-role-policy \
  --role-name EC2-ECR-Access \
  --policy-name ECSReadAccess \
  --policy-document file://ecs-read-policy.json \
  --region us-east-1
```

## Test After Adding Permissions

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
