#!/bin/bash
set -e

ROLE_NAME="EC2-ECR-Access"
POLICY_NAME="ECSGatingTestPermissions"
REGION="us-east-1"

echo "Adding ECS gating test permissions to role: $ROLE_NAME"

# Create inline policy
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file://ecs-test-permissions.json \
  --region "$REGION"

echo "✅ Permissions added successfully"
echo "⏳ Waiting 10 seconds for IAM propagation..."
sleep 10

echo "🧪 Running ECS worker gating test..."
bash scripts/testing/test-ecs-worker-gating.sh
