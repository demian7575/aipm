#!/bin/bash
set -e

echo "📝 Updating ECS task to download q-worker.sh at runtime..."

REGION="us-east-1"
TASK_FAMILY="aipm-amazon-q-worker"

# Get current task definition
CURRENT_DEF=$(AWS_PROFILE=myaws aws ecs describe-task-definition --task-definition $TASK_FAMILY --region $REGION --query 'taskDefinition' --output json)

# Create new task definition with runtime script download
cat > /tmp/new-task-def.json <<'EOF'
{
  "family": "aipm-amazon-q-worker",
  "taskRoleArn": "arn:aws:iam::728378229251:role/aipm-q-worker-role",
  "executionRoleArn": "arn:aws:iam::728378229251:role/aipm-ecs-task-execution-role",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "amazon-q-worker",
      "image": "728378229251.dkr.ecr.us-east-1.amazonaws.com/aipm-q-worker:latest",
      "cpu": 0,
      "memory": 2048,
      "essential": true,
      "command": [
        "/bin/bash",
        "-c",
        "curl -fsSL https://raw.githubusercontent.com/demian7575/aipm/main/q-worker.sh -o /usr/local/bin/q-worker.sh && chmod +x /usr/local/bin/q-worker.sh && /usr/local/bin/q-worker.sh"
      ],
      "environment": [],
      "secrets": [
        {
          "name": "GITHUB_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:728378229251:secret:aipm/github-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aipm-amazon-q-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs/amazon-q-worker"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048"
}
EOF

# Register new task definition
AWS_PROFILE=myaws aws ecs register-task-definition --cli-input-json file:///tmp/new-task-def.json --region $REGION

echo "✅ Task definition updated!"
echo "📝 New tasks will download the latest q-worker.sh from GitHub at runtime"
echo "🎯 No Docker rebuild needed!"
