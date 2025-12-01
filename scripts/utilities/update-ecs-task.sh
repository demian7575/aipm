#!/bin/bash
set -e

echo "📝 Updating ECS task definition with new q-worker.sh..."

REGION="us-east-1"
TASK_FAMILY="aipm-amazon-q-worker"

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition --task-definition $TASK_FAMILY --region $REGION)

# Extract the task definition JSON (without metadata)
NEW_TASK_DEF=$(echo "$TASK_DEF" | python3 -c "
import sys, json
task = json.load(sys.stdin)['taskDefinition']
# Remove fields that can't be in RegisterTaskDefinition
for key in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'compatibilities', 'registeredAt', 'registeredBy']:
    task.pop(key, None)
print(json.dumps(task, indent=2))
")

# Register new task definition (same config, will pick up new script from image)
echo "$NEW_TASK_DEF" > /tmp/task-def.json
aws ecs register-task-definition --cli-input-json file:///tmp/task-def.json --region $REGION

echo "✅ Task definition updated!"
echo "📝 New tasks will use the updated q-worker.sh without jq dependency"
