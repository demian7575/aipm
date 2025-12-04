# ECS Worker Test Setup

## Issue

The ECS worker gating test fails with:
```
AccessDeniedException: User is not authorized to perform: ecs:DescribeClusters
```

## Resolution

The EC2 instance role `EC2-ECR-Access` needs ECS read permissions to run the gating test.

### Add Permissions (Run from a user/role with IAM permissions)

```bash
./add-ecs-permissions.sh
```

Or manually via AWS Console:
1. Go to IAM → Roles → EC2-ECR-Access
2. Add inline policy with these permissions:
   - `ecs:DescribeClusters`
   - `ecs:DescribeTaskDefinition`

### Run Test

After adding permissions:
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
