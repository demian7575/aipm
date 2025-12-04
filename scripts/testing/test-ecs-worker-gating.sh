#!/bin/bash

REGION="us-east-1"

echo "🧪 ECS Worker Gating Test"

# Test cluster exists
if ! CLUSTER_STATUS=$(aws ecs describe-clusters --clusters aipm-cluster --region $REGION --query 'clusters[0].status' --output text 2>&1); then
    echo "❌ Failed to check cluster: $CLUSTER_STATUS"
    exit 1
fi

if echo "$CLUSTER_STATUS" | grep -q "ACTIVE"; then
    echo "✅ Cluster active"
else
    echo "❌ Cluster not active: $CLUSTER_STATUS"
    exit 1
fi

# Test task definition exists
if ! TASK_DEF=$(aws ecs describe-task-definition --task-definition aipm-amazon-q-worker --region $REGION --query 'taskDefinition.family' --output text 2>&1); then
    echo "❌ Failed to check task definition: $TASK_DEF"
    exit 1
fi

if echo "$TASK_DEF" | grep -q "aipm-amazon-q-worker"; then
    echo "✅ Task definition exists"
else
    echo "❌ Task definition not found: $TASK_DEF"
    exit 1
fi

echo "✅ ECS worker test passed"
