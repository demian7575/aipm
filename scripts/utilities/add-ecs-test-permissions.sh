#!/bin/bash
set -e

echo "Adding ECS read permissions to EC2-ECR-Access role..."

aws iam put-role-policy \
  --role-name EC2-ECR-Access \
  --policy-name ECSReadAccess \
  --policy-document '{
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
  }'

echo "✅ ECS permissions added successfully"
echo "Note: You may need to wait a few seconds for permissions to propagate"
