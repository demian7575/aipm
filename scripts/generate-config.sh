#!/bin/bash
# Configuration loader - generates config files from .env

set -e

ENV_FILE="${1:-.env.prod}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file $ENV_FILE not found"
    exit 1
fi

# Load environment variables
source "$ENV_FILE"

# Resolve derived URLs
API_BASE_URL="http://${EC2_HOST}"
API_ENDPOINT="http://${EC2_HOST}:${API_PORT}"
KIRO_ENDPOINT="http://${EC2_HOST}:${KIRO_PORT}"
EC2_TERMINAL_URL="ws://${EC2_HOST}:${TERMINAL_PORT}"

# Generate frontend config.js
cat > apps/frontend/public/config.js << EOF
window.CONFIG = {
  API_BASE_URL: '${API_BASE_URL}',
  apiEndpoint: '${API_ENDPOINT}',
  EC2_TERMINAL_URL: '${EC2_TERMINAL_URL}',
  ENVIRONMENT: '${ENVIRONMENT}',
  environment: '${ENVIRONMENT}',
  stage: '${STAGE}',
  region: '${REGION}',
  storiesTable: '${STORIES_TABLE}',
  acceptanceTestsTable: '${ACCEPTANCE_TESTS_TABLE}',
  DEBUG: ${DEBUG}
};
EOF

# Generate backend .env
cat > scripts/.env << EOF
KIRO_API_PORT=${API_PORT}
STORIES_TABLE=${STORIES_TABLE}
ACCEPTANCE_TESTS_TABLE=${ACCEPTANCE_TESTS_TABLE}
REGION=${REGION}
EOF

echo "✅ Configuration files generated from $ENV_FILE"
echo "   - apps/frontend/public/config.js"
echo "   - scripts/.env"
