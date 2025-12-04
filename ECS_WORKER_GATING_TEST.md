# ECS Worker Gating Test

## Test: `test-ecs-worker-gating.sh`

**Constraints:** None

**Acceptance Criteria:** Works

## What It Tests

This minimal gating test verifies that the ECS Amazon Q worker infrastructure is properly deployed:

1. **ECS Cluster Status** - Confirms `aipm-cluster` exists and is ACTIVE
2. **Task Definition** - Confirms `aipm-amazon-q-worker` task definition is registered

## Prerequisites

The test requires ECS read permissions. If running from an EC2 instance, the instance role needs:

```bash
aws iam attach-role-policy \
  --role-name EC2-ECR-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
```

Or attach a custom policy with these permissions:
- `ecs:DescribeClusters`
- `ecs:DescribeTaskDefinition`

## Usage

```bash
./scripts/testing/test-ecs-worker-gating.sh
```

## Expected Output

### Success
```
🧪 ECS Worker Gating Test
✅ Cluster active
✅ Task definition exists
✅ ECS worker test passed
```

Exit code: 0 (success)

### Permission Error
```
🧪 ECS Worker Gating Test
❌ Failed to check cluster: 
An error occurred (AccessDeniedException) when calling the DescribeClusters operation...
```

Exit code: 1 (failure)

## Test Implementation

The test uses AWS CLI to verify:
- ECS cluster is in ACTIVE state
- Task definition exists and is properly named

Both checks must pass for the test to succeed. The test now includes improved error handling to clearly report permission issues or infrastructure problems.

## Current Status

✅ Test script implemented with error handling
❌ Requires ECS permissions to be added to EC2 instance role
