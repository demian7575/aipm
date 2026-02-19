#!/bin/bash
# Helper script to read environment configuration from central YAML file
# Usage: source scripts/utilities/load-env-config.sh <prod|dev|production|development>

ENV_ARG="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../../config/environments.yaml"

# Normalize environment name (production -> prod, development -> dev)
case "$ENV_ARG" in
    production) ENV="prod" ;;
    development) ENV="dev" ;;
    *) ENV="$ENV_ARG" ;;
esac

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    return 1 2>/dev/null || exit 1
fi

# Get instance ID from config
export INSTANCE_ID=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "instance_id")

# Check instance state and wake up if stopped
INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null)

if [[ "$INSTANCE_STATE" == "stopped" ]]; then
    echo "🔄 Starting $ENV EC2 instance ($INSTANCE_ID)..."
    aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region us-east-1 > /dev/null 2>&1
    
    # Wait for instance to be running
    echo "⏳ Waiting for instance to start..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region us-east-1
    
    # Wait for services to initialize
    echo "⏳ Waiting for services to initialize (30s)..."
    sleep 30
    
    echo "✅ Instance started"
fi

# Get current public IP from AWS
export EC2_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null)

if [[ -z "$EC2_IP" || "$EC2_IP" == "None" ]]; then
    echo "❌ Failed to get instance IP"
    export EC2_IP="INSTANCE_ERROR"
else
    echo "✅ Fetched IP from AWS: $EC2_IP"
fi
export API_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "api_port")
export SEMANTIC_API_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "semantic_api_port")
export SESSION_POOL_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "session_pool_port")
export TERMINAL_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "terminal_port")
export S3_BUCKET=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "s3_bucket")
export S3_URL=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "s3_url")
export DYNAMODB_STORIES_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_stories_table")
export DYNAMODB_TESTS_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_tests_table")
export DYNAMODB_PRS_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_prs_table")
export DYNAMODB_TEST_RUNS_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_test_runs_table")

# Computed values
export API_BASE="http://${EC2_IP}:${API_PORT}"
export SEMANTIC_API_BASE="http://${EC2_IP}:${SEMANTIC_API_PORT}"
export SESSION_POOL_URL="http://${EC2_IP}:${SESSION_POOL_PORT}"
export TERMINAL_URL="ws://${EC2_IP}:${TERMINAL_PORT}"

echo "✅ Loaded $ENV environment configuration"
echo "   EC2: $EC2_IP"
echo "   API: $API_BASE"
