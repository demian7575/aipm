#!/bin/bash
set -e

REGION="us-east-1"

echo "🧪 ECS Worker Gating Test"

# Test cluster exists
aws ecs describe-clusters --clusters aipm-cluster --region $REGION --query 'clusters[0].status' --output text | grep -q "ACTIVE" && echo "✅ Cluster active" || exit 1

# Test task definition exists
aws ecs describe-task-definition --task-definition aipm-amazon-q-worker --region $REGION --query 'taskDefinition.family' --output text | grep -q "aipm-amazon-q-worker" && echo "✅ Task definition exists" || exit 1

echo "✅ ECS worker test passed"
