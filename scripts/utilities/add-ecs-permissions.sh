#!/bin/bash
set -e

echo "🔐 Adding ECS permissions to EC2 instance role..."

ROLE_NAME="EC2-ECR-Access"
POLICY_NAME="ECSReadAccess"

cat > /tmp/ecs-policy.json <<'EOF'
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
EOF

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file:///tmp/ecs-policy.json \
  --region us-east-1

echo "✅ ECS permissions added to $ROLE_NAME"
