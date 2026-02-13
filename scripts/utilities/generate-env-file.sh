#!/bin/bash
# Generate .env file from config/environments.yaml
# Usage: generate-env-file.sh <prod|dev> [output-file]

set -e

ENV=$1
OUTPUT_FILE=${2:-.env}

if [[ -z "$ENV" ]]; then
    echo "Usage: $0 <prod|dev> [output-file]"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment configuration
source "$SCRIPT_DIR/load-env-config.sh" "$ENV"

# Generate .env file
cat > "$OUTPUT_FILE" << EOF
# AIPM Backend Environment Configuration
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Environment: $ENV

# Environment
ENVIRONMENT=$ENV
STAGE=$ENV

# Server
PORT=4000

# DynamoDB Tables
STORIES_TABLE=$DYNAMODB_STORIES_TABLE
ACCEPTANCE_TESTS_TABLE=$DYNAMODB_TESTS_TABLE
TEST_RUNS_TABLE=$DYNAMODB_TEST_RUNS_TABLE
PRS_TABLE=$DYNAMODB_PRS_TABLE

# AWS
AWS_REGION=us-east-1

# GitHub (from secrets)
GITHUB_TOKEN=${GITHUB_TOKEN:-}
EOF

echo "✅ Generated $OUTPUT_FILE for $ENV environment"
