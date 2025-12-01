#!/bin/bash
set -e

echo "🚀 Deploying Amazon Q ECS Worker..."

# Configuration
REGION="us-east-1"
CLUSTER_NAME="aipm-cluster"
TASK_FAMILY="aipm-amazon-q-worker"
SERVICE_NAME="aipm-q-worker"
REPO_NAME="aipm-q-worker"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

# Get default VPC and subnets
echo "📡 Getting VPC configuration..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region $REGION | tr '\t' ',')
SUBNET_1=$(echo $SUBNET_IDS | cut -d',' -f1)
SUBNET_2=$(echo $SUBNET_IDS | cut -d',' -f2)

echo "  VPC: $VPC_ID"
echo "  Subnets: $SUBNET_1, $SUBNET_2"

# Create security group
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name aipm-q-worker-sg \
  --description "Security group for AIPM Amazon Q worker" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=aipm-q-worker-sg" \
    --query "SecurityGroups[0].GroupId" \
    --output text \
    --region $REGION)

echo "  Security Group: $SG_ID"

# Allow outbound traffic
aws ec2 authorize-security-group-egress \
  --group-id $SG_ID \
  --protocol -1 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || true

# Create ECR repository
echo "📦 Creating ECR repository..."
aws ecr create-repository --repository-name $REPO_NAME --region $REGION 2>/dev/null || echo "  Repository already exists"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
echo "🏗️  Building Docker image..."
docker build -f Dockerfile.q-worker -t $REPO_NAME:latest .

# Tag and push
echo "⬆️  Pushing to ECR..."
docker tag $REPO_NAME:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Create IAM roles
echo "👤 Creating IAM roles..."

# Task execution role
cat > /tmp/ecs-task-execution-role.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name aipm-ecs-task-execution-role \
  --assume-role-policy-document file:///tmp/ecs-task-execution-role.json 2>/dev/null || true

aws iam attach-role-policy \
  --role-name aipm-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

# Task role (for Amazon Q worker)
cat > /tmp/ecs-task-role.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name aipm-q-worker-role \
  --assume-role-policy-document file:///tmp/ecs-task-role.json 2>/dev/null || true

# Attach policies to task role
cat > /tmp/q-worker-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/aipm-amazon-q-queue"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name aipm-q-worker-role \
  --policy-name aipm-q-worker-policy \
  --policy-document file:///tmp/q-worker-policy.json

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group --log-group-name /ecs/aipm-amazon-q-worker --region $REGION 2>/dev/null || true

# Create ECS cluster
echo "🏢 Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION 2>/dev/null || echo "  Cluster already exists"

# Register task definition
echo "📝 Registering task definition..."
cat > /tmp/task-definition.json <<EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/aipm-ecs-task-execution-role",
  "taskRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/aipm-q-worker-role",
  "containerDefinitions": [
    {
      "name": "amazon-q-worker",
      "image": "${ECR_URI}:latest",
      "essential": true,
      "environment": [
        {"name": "GITHUB_OWNER", "value": "demian7575"},
        {"name": "GITHUB_REPO", "value": "aipm"},
        {"name": "DYNAMODB_TABLE", "value": "aipm-amazon-q-queue"},
        {"name": "AWS_REGION", "value": "${REGION}"}
      ],
      "secrets": [
        {
          "name": "GITHUB_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:aipm/github-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aipm-amazon-q-worker",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/task-definition.json --region $REGION

# Store GitHub token in Secrets Manager
echo "🔑 Storing GitHub token..."
if [ -n "$GITHUB_TOKEN" ]; then
  aws secretsmanager create-secret \
    --name aipm/github-token \
    --secret-string "$GITHUB_TOKEN" \
    --region $REGION 2>/dev/null || \
  aws secretsmanager update-secret \
    --secret-id aipm/github-token \
    --secret-string "$GITHUB_TOKEN" \
    --region $REGION
else
  echo "⚠️  GITHUB_TOKEN not set. Please set it manually:"
  echo "  aws secretsmanager create-secret --name aipm/github-token --secret-string YOUR_TOKEN"
fi

# Update Lambda IAM role to allow ECS task execution
echo "🔧 Updating Lambda permissions..."
LAMBDA_ROLE=$(aws lambda get-function --function-name aipm-backend-prod-api --query 'Configuration.Role' --output text --region $REGION | cut -d'/' -f2)

cat > /tmp/lambda-ecs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::${ACCOUNT_ID}:role/aipm-ecs-task-execution-role",
        "arn:aws:iam::${ACCOUNT_ID}:role/aipm-q-worker-role"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $LAMBDA_ROLE \
  --policy-name aipm-ecs-trigger-policy \
  --policy-document file:///tmp/lambda-ecs-policy.json

# Save configuration
cat > /tmp/ecs-config.json <<EOF
{
  "cluster": "$CLUSTER_NAME",
  "taskDefinition": "$TASK_FAMILY",
  "subnets": ["$SUBNET_1", "$SUBNET_2"],
  "securityGroup": "$SG_ID",
  "region": "$REGION"
}
EOF

echo ""
echo "✅ ECS Worker deployed successfully!"
echo ""
echo "📋 Configuration:"
echo "  Cluster: $CLUSTER_NAME"
echo "  Task Definition: $TASK_FAMILY"
echo "  ECR Image: $ECR_URI:latest"
echo "  Subnets: $SUBNET_1, $SUBNET_2"
echo "  Security Group: $SG_ID"
echo ""
echo "🔧 Next steps:"
echo "  1. Update Lambda to use ECS trigger (see apps/backend/ecs-trigger.js)"
echo "  2. Test with: aws ecs run-task --cluster $CLUSTER_NAME --task-definition $TASK_FAMILY --launch-type FARGATE ..."
echo ""
