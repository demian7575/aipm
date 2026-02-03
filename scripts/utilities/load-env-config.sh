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

# Export environment variables by calling Python directly
export EC2_IP=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "ec2_ip")
export API_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "api_port")
export SEMANTIC_API_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "semantic_api_port")
export SESSION_POOL_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "session_pool_port")
export TERMINAL_PORT=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "terminal_port")
export S3_BUCKET=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "s3_bucket")
export S3_URL=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "s3_url")
export DYNAMODB_STORIES_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_stories_table")
export DYNAMODB_TESTS_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_tests_table")
export DYNAMODB_PRS_TABLE=$(python3 "$SCRIPT_DIR/read-yaml.py" "$CONFIG_FILE" "$ENV" "dynamodb_prs_table")

# Computed values
export API_BASE="http://${EC2_IP}:${API_PORT}"
export SEMANTIC_API_BASE="http://${EC2_IP}:${SEMANTIC_API_PORT}"
export SESSION_POOL_URL="http://${EC2_IP}:${SESSION_POOL_PORT}"
export TERMINAL_URL="ws://${EC2_IP}:${TERMINAL_PORT}"

echo "✅ Loaded $ENV environment configuration"
echo "   EC2: $EC2_IP"
echo "   API: $API_BASE"
