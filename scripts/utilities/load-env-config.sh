#!/bin/bash
# Helper script to read environment configuration from central YAML file
# Usage: source scripts/utilities/load-env-config.sh <prod|dev>

ENV="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../../config/environments.yaml"

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    return 1 2>/dev/null || exit 1
fi

# Parse YAML using Python (available in GitHub Actions)
read_config() {
    python3 -c "
import yaml
import sys

with open('$CONFIG_FILE', 'r') as f:
    config = yaml.safe_load(f)
    env_config = config.get('$ENV', {})
    key = sys.argv[1]
    print(env_config.get(key, ''))
" "$1"
}

# Export environment variables
export EC2_IP=$(read_config "ec2_ip")
export API_PORT=$(read_config "api_port")
export SEMANTIC_API_PORT=$(read_config "semantic_api_port")
export TERMINAL_PORT=$(read_config "terminal_port")
export S3_BUCKET=$(read_config "s3_bucket")
export S3_URL=$(read_config "s3_url")
export DYNAMODB_STORIES_TABLE=$(read_config "dynamodb_stories_table")
export DYNAMODB_TESTS_TABLE=$(read_config "dynamodb_tests_table")
export DYNAMODB_PRS_TABLE=$(read_config "dynamodb_prs_table")

# Computed values
export API_BASE="http://${EC2_IP}:${API_PORT}"
export SEMANTIC_API_BASE="http://${EC2_IP}:${SEMANTIC_API_PORT}"
export TERMINAL_URL="ws://${EC2_IP}:${TERMINAL_PORT}"

echo "✅ Loaded $ENV environment configuration"
echo "   EC2: $EC2_IP"
echo "   API: $API_BASE"
