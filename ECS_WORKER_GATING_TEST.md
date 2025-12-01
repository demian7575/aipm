# ECS Worker Gating Test

## Test: `test-ecs-worker-gating.sh`

**Constraints:** None

**Acceptance Criteria:** Works

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
