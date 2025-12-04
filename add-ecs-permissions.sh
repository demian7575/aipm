#!/bin/bash
set -e

ROLE_NAME="EC2-ECR-Access"
POLICY_NAME="ECSTestingPolicy"
REGION="us-east-1"

echo "Adding ECS testing permissions to $ROLE_NAME..."

# Create and attach inline policy
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file://ecs-test-policy.json \
  --region "$REGION"

echo "✅ ECS permissions added successfully"
echo "Run the test again: ./scripts/testing/test-ecs-worker-gating.sh"
