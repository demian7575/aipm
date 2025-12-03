# ECS Worker Gating Test Result

**Date:** 2025-12-03T18:36:55Z  
**Status:** ❌ FAILED - Missing Permissions

## Test Execution

```bash
./scripts/testing/test-ecs-worker-gating.sh
```

## Error

```
An error occurred (AccessDeniedException) when calling the DescribeClusters operation: 
User: arn:aws:sts::728378229251:assumed-role/EC2-ECR-Access/i-016241c7a18884e80 
is not authorized to perform: ecs:DescribeClusters on resource: 
arn:aws:ecs:us-east-1:728378229251:cluster/aipm-cluster 
because no identity-based policy allows the ecs:DescribeClusters action
```

## Root Cause

The EC2 instance role `EC2-ECR-Access` lacks the required ECS permissions to run the gating test.

## Required Permissions

Add the following policy to the `EC2-ECR-Access` IAM role:

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

## Resolution Steps

1. Open AWS IAM Console
2. Navigate to Roles → `EC2-ECR-Access`
3. Add inline policy named `ECSReadAccess` with the JSON above
4. Re-run the test: `./scripts/testing/test-ecs-worker-gating.sh`

## Helper Script

A script has been created to automate this (requires IAM admin permissions):

```bash
./scripts/utilities/add-ecs-permissions.sh
```

## Next Steps

Once permissions are added, the test should pass with:

```
🧪 ECS Worker Gating Test
✅ Cluster active
✅ Task definition exists
✅ ECS worker test passed
```
