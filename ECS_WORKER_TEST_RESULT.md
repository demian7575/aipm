# ECS Worker Test Result

## Test Execution

**Date:** 2025-12-04T03:15:09Z  
**Test:** `./scripts/testing/test-ecs-worker-gating.sh`  
**Status:** ❌ FAILED (Permissions Issue)

## Error

```
An error occurred (AccessDeniedException) when calling the DescribeClusters operation: 
User: arn:aws:sts::728378229251:assumed-role/EC2-ECR-Access/i-016241c7a18884e80 
is not authorized to perform: ecs:DescribeClusters on resource: 
arn:aws:ecs:us-east-1:728378229251:cluster/aipm-cluster 
because no identity-based policy allows the ecs:DescribeClusters action
```

## Root Cause

The EC2 instance role `EC2-ECR-Access` lacks ECS read permissions required by the gating test.

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

## Manual Fix (Administrator Required)

```bash
aws iam put-role-policy \
  --role-name EC2-ECR-Access \
  --policy-name ECSReadAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    }]
  }' \
  --region us-east-1
```

## Retest After Fix

Once permissions are added, rerun:

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
