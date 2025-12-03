# ECS Worker Gating Test

## Test: `test-ecs-worker-gating.sh`

**Constraints:** None

**Acceptance Criteria:** Works

## Prerequisites

The test requires ECS read permissions. If running from an EC2 instance, add permissions first:

```bash
# Run from a user/role with IAM permissions (e.g., AWS Console CloudShell)
./scripts/utilities/add-ecs-test-permissions.sh
```

This adds the following permissions to the `EC2-ECR-Access` role:
- `ecs:DescribeClusters`
- `ecs:DescribeTaskDefinition`

## What It Tests

This minimal gating test verifies that the ECS Amazon Q worker infrastructure is properly deployed:

1. **ECS Cluster Status** - Confirms `aipm-cluster` exists and is ACTIVE
2. **Task Definition** - Confirms `aipm-amazon-q-worker` task definition is registered

## Usage

```bash
./scripts/testing/test-ecs-worker-gating.sh
```

## Expected Output

```
🧪 ECS Worker Gating Test
✅ Cluster active
✅ Task definition exists
✅ ECS worker test passed
```

Exit code: 0 (success)

## Test Implementation

The test uses AWS CLI to verify:
- ECS cluster is in ACTIVE state
- Task definition exists and is properly named

Both checks must pass for the test to succeed.

## Troubleshooting

If you see `AccessDeniedException`:
1. Run `./scripts/utilities/add-ecs-test-permissions.sh` from CloudShell or a privileged environment
2. Wait 10-30 seconds for IAM permissions to propagate
3. Retry the test
