#!/bin/bash
set -e

echo "🔍 Verifying ECS Container Name Configuration..."
echo ""

REGION="us-east-1"
TASK_FAMILY="aipm-amazon-q-worker"
CLUSTER_NAME="aipm-cluster"
EXPECTED_CONTAINER_NAME="amazon-q-worker"

# Test 1: Verify task definition contains correct container name
echo "1️⃣ Checking task definition container name..."
CONTAINER_NAME=$(aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --region $REGION \
  --query 'taskDefinition.containerDefinitions[0].name' \
  --output text)

if [ "$CONTAINER_NAME" = "$EXPECTED_CONTAINER_NAME" ]; then
  echo "   ✅ Container name is correct: $CONTAINER_NAME"
else
  echo "   ❌ Container name mismatch! Expected: $EXPECTED_CONTAINER_NAME, Got: $CONTAINER_NAME"
  exit 1
fi

# Test 2: Run a test task with container overrides
echo ""
echo "2️⃣ Testing task execution with container overrides..."
TASK_ARN=$(aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --task-definition $TASK_FAMILY \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-021cb68f18ae60508,subnet-03525df27c75e12b5],securityGroups=[sg-0ad4bc9d85549a7c7],assignPublicIp=ENABLED}" \
  --overrides "{
    \"containerOverrides\": [{
      \"name\": \"$EXPECTED_CONTAINER_NAME\",
      \"environment\": [
        {\"name\": \"TASK_ID\", \"value\": \"verify-test-$(date +%s)\"},
        {\"name\": \"TASK_TITLE\", \"value\": \"Container Name Verification Test\"},
        {\"name\": \"TASK_DETAILS\", \"value\": \"echo 'Container name verified'\"},
        {\"name\": \"BRANCH_NAME\", \"value\": \"verify-container-name\"},
        {\"name\": \"GITHUB_OWNER\", \"value\": \"demian7575\"},
        {\"name\": \"GITHUB_REPO\", \"value\": \"aipm\"}
      ]
    }]
  }" \
  --region $REGION \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "$TASK_ARN" ]; then
  echo "   ❌ Failed to start task"
  exit 1
fi

echo "   ✅ Task started successfully: $TASK_ARN"

# Test 3: Wait for task to reach RUNNING state
echo ""
echo "3️⃣ Waiting for task to reach RUNNING state..."
for i in {1..30}; do
  TASK_STATUS=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $REGION \
    --query 'tasks[0].lastStatus' \
    --output text)
  
  echo "   Status: $TASK_STATUS (attempt $i/30)"
  
  if [ "$TASK_STATUS" = "RUNNING" ]; then
    echo "   ✅ Task is running successfully"
    break
  elif [ "$TASK_STATUS" = "STOPPED" ]; then
    echo "   ❌ Task stopped unexpectedly"
    aws ecs describe-tasks \
      --cluster $CLUSTER_NAME \
      --tasks $TASK_ARN \
      --region $REGION \
      --query 'tasks[0].stoppedReason'
    exit 1
  fi
  
  sleep 2
done

# Test 4: Stop the test task
echo ""
echo "4️⃣ Cleaning up test task..."
aws ecs stop-task \
  --cluster $CLUSTER_NAME \
  --task $TASK_ARN \
  --region $REGION \
  --query 'task.taskArn' \
  --output text > /dev/null

echo "   ✅ Test task stopped"

echo ""
echo "✅ All verification tests passed!"
echo ""
echo "Summary:"
echo "  - Container name in task definition: $CONTAINER_NAME"
echo "  - Task started successfully with overrides"
echo "  - Task reached RUNNING state"
echo ""
