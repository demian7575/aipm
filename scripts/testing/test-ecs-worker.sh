#!/bin/bash
set -e

echo "🧪 Testing ECS Amazon Q Worker..."

# Test 1: Check if cluster exists
echo "1️⃣ Checking ECS cluster..."
aws ecs describe-clusters --clusters aipm-cluster --region us-east-1 --query 'clusters[0].status' --output text

# Test 2: Check task definition
echo "2️⃣ Checking task definition..."
aws ecs describe-task-definition --task-definition aipm-amazon-q-worker --region us-east-1 --query 'taskDefinition.family' --output text

# Test 3: Check ECR image
echo "3️⃣ Checking ECR image..."
aws ecr describe-images --repository-name aipm-q-worker --region us-east-1 --query 'imageDetails[0].imageTags[0]' --output text

# Test 4: Check IAM roles
echo "4️⃣ Checking IAM roles..."
aws iam get-role --role-name aipm-ecs-task-execution-role --query 'Role.RoleName' --output text
aws iam get-role --role-name aipm-q-worker-role --query 'Role.RoleName' --output text

# Test 5: Check Lambda environment variables
echo "5️⃣ Checking Lambda configuration..."
aws lambda get-function-configuration --function-name aipm-backend-prod-api --region us-east-1 --query 'Environment.Variables.ECS_SUBNETS' --output text

echo ""
echo "✅ All infrastructure checks passed!"
echo ""
echo "📋 To test full workflow:"
echo "  1. Set GitHub token: aws secretsmanager create-secret --name aipm/github-token --secret-string YOUR_TOKEN"
echo "  2. Test API: curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/personal-delegate -d '{\"title\":\"Test\",\"details\":\"Test task\",\"target\":\"pr\"}'"
echo "  3. Monitor logs: aws logs tail /ecs/aipm-amazon-q-worker --follow"
