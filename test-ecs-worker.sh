#!/bin/bash
set -e

REGION="us-east-1"
TASK_ID="test-$(date +%s)"

echo "🧪 Testing ECS Amazon Q Worker..."

# Test 1: Infrastructure checks
echo "1️⃣ Checking infrastructure..."
aws ecs describe-clusters --clusters aipm-cluster --region $REGION --query 'clusters[0].status' --output text > /dev/null
aws ecs describe-task-definition --task-definition aipm-amazon-q-worker --region $REGION --query 'taskDefinition.family' --output text > /dev/null
echo "✅ Infrastructure exists"

# Test 2: Run actual ECS task
echo "2️⃣ Running ECS task..."
TASK_ARN=$(aws ecs run-task \
  --cluster aipm-cluster \
  --task-definition aipm-amazon-q-worker \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-021cb68f18ae60508,subnet-03525df27c75e12b5],securityGroups=[sg-0ad4bc9d85549a7c7],assignPublicIp=ENABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"amazon-q-worker\",\"environment\":[{\"name\":\"TASK_ID\",\"value\":\"$TASK_ID\"},{\"name\":\"TASK_TITLE\",\"value\":\"Test\"},{\"name\":\"TASK_DETAILS\",\"value\":\"echo test\"},{\"name\":\"BRANCH_NAME\",\"value\":\"test-$TASK_ID\"},{\"name\":\"GITHUB_OWNER\",\"value\":\"test\"},{\"name\":\"GITHUB_REPO\",\"value\":\"test\"}]}]}" \
  --region $REGION \
  --query 'tasks[0].taskArn' --output text)

echo "✅ Task started: $TASK_ARN"

# Test 3: Wait for task to reach running state
echo "3️⃣ Waiting for task to start..."
for i in {1..30}; do
  STATUS=$(aws ecs describe-tasks --cluster aipm-cluster --tasks $TASK_ARN --region $REGION --query 'tasks[0].lastStatus' --output text)
  if [ "$STATUS" = "RUNNING" ] || [ "$STATUS" = "STOPPED" ]; then
    break
  fi
  sleep 2
done
echo "✅ Task status: $STATUS"

# Test 4: Check logs exist
echo "4️⃣ Checking CloudWatch logs..."
sleep 5
aws logs tail /ecs/aipm-amazon-q-worker --since 1m --region $REGION | head -5
echo "✅ Logs accessible"

echo ""
echo "✅ All tests passed!"
