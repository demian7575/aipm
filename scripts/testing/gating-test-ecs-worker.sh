#!/bin/bash
set -e

echo "🧪 ECS Worker Gating Test"

# Check cluster exists
aws ecs describe-clusters --clusters aipm-cluster --region us-east-1 --query 'clusters[0].status' --output text > /dev/null

# Check task definition exists
aws ecs describe-task-definition --task-definition aipm-amazon-q-worker --region us-east-1 --query 'taskDefinition.family' --output text > /dev/null

echo "✅ ECS worker test passed"
