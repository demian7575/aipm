#!/bin/bash
set -e

REGION="us-east-1"

echo "🧪 ECS Worker Gating Test"
echo ""

# Check if we have ECS permissions
if ! aws ecs describe-clusters --clusters aipm-cluster --region $REGION --query 'clusters[0].status' --output text 2>/dev/null; then
    echo "❌ Missing ECS permissions"
    echo ""
    echo "To fix, run this command with appropriate AWS credentials:"
    echo ""
    echo "  aws iam attach-role-policy \\"
    echo "    --role-name EC2-ECR-Access \\"
    echo "    --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess"
    echo ""
    exit 1
fi

# Test cluster exists
aws ecs describe-clusters --clusters aipm-cluster --region $REGION --query 'clusters[0].status' --output text | grep -q "ACTIVE" && echo "✅ Cluster active" || exit 1

# Test task definition exists
aws ecs describe-task-definition --task-definition aipm-amazon-q-worker --region $REGION --query 'taskDefinition.family' --output text | grep -q "aipm-amazon-q-worker" && echo "✅ Task definition exists" || exit 1

echo "✅ ECS worker test passed"
