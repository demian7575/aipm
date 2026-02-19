#!/bin/bash

# Monitor idle time and stop EC2 after 30 minutes
IDLE_THRESHOLD=1800  # 30 minutes
STATE_FILE="/tmp/ec2-idle-state"
REGION="us-east-1"

# Initialize state file if doesn't exist
if [ ! -f "$STATE_FILE" ]; then
    echo "0" > "$STATE_FILE"
fi

# Detect environment from hostname or config file
if [ -f /home/ec2-user/aipm/config/environment ]; then
    ENV=$(cat /home/ec2-user/aipm/config/environment)
else
    # Try to detect from instance metadata
    INSTANCE_ID=$(ec2-metadata --instance-id 2>/dev/null | cut -d' ' -f2)
    ENV=$(aws ec2 describe-tags \
        --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=Environment" \
        --query 'Tags[0].Value' \
        --output text \
        --region $REGION 2>/dev/null)
    
    # Normalize environment name
    if [ "$ENV" == "production" ]; then
        ENV="prod"
    elif [ "$ENV" == "development" ]; then
        ENV="dev"
    elif [ -z "$ENV" ] || [ "$ENV" == "None" ]; then
        # Default to prod if detection fails
        ENV="prod"
    fi
fi

TABLE_NAME="aipm-backend-${ENV}-stories"

# Check DynamoDB read activity in last 30 minutes
read_activity=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name ConsumedReadCapacityUnits \
    --dimensions Name=TableName,Value=$TABLE_NAME \
    --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 1800 \
    --statistics Sum \
    --region $REGION \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null)

# Check if there was any read activity
if [ -n "$read_activity" ] && [ "$read_activity" != "None" ] && [ "$read_activity" != "0.0" ]; then
    # Active - reset idle counter
    echo "0" > "$STATE_FILE"
    echo "$(date): Active - DynamoDB reads detected ($read_activity RCUs on $TABLE_NAME)"
else
    # Idle - increment counter
    idle_time=$(cat "$STATE_FILE")
    idle_time=$((idle_time + 60))  # Add 1 minute
    echo "$idle_time" > "$STATE_FILE"
    
    echo "$(date): Idle for $idle_time seconds (no DynamoDB reads on $TABLE_NAME)"
    
    if [ $idle_time -ge $IDLE_THRESHOLD ]; then
        echo "$(date): Idle threshold reached, stopping instance..."
        sudo shutdown -h now
    fi
fi
