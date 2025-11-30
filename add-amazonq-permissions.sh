#!/bin/bash
set -e

echo "🔐 Adding Amazon Q Pro permissions to ECS task role..."

ROLE_NAME="aipm-q-worker-role"
POLICY_NAME="AmazonQDeveloperAccess"

# Create policy document
cat > /tmp/amazonq-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codewhisperer:GenerateRecommendations",
        "codewhisperer:GenerateCompletions"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Attach policy to role
AWS_PROFILE=myaws aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file:///tmp/amazonq-policy.json \
  --region us-east-1

echo "✅ Permissions added!"
echo "📝 ECS tasks can now use Amazon Q Pro with IAM authentication"
