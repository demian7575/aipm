#!/bin/bash
# Generate environment-specific config.js
# Usage: ./generate-config.sh <environment>
# Example: ./generate-config.sh prod

set -e

ENV=${1:-prod}

if [ "$ENV" = "prod" ]; then
  # Use EC2 endpoint for production (current architecture)
  API_URL="http://44.197.204.18"
  ENVIRONMENT="production"
  STAGE="prod"
  STORIES_TABLE="aipm-backend-prod-stories"
  TESTS_TABLE="aipm-backend-prod-acceptance-tests"
  DEBUG="false"
  EC2_TERMINAL_URL="ws://44.197.204.18:8080"
elif [ "$ENV" = "dev" ]; then
  # Use EC2 endpoint for development (AI flow enabled)
  API_URL="http://44.197.204.18:4000"
  ENVIRONMENT="development"
  STAGE="dev"
  STORIES_TABLE="aipm-backend-dev-stories"
  TESTS_TABLE="aipm-backend-dev-acceptance-tests"
  DEBUG="true"
  EC2_TERMINAL_URL="ws://44.197.204.18:8080"
else
  echo "Error: Invalid environment. Use 'prod' or 'dev'"
  exit 1
fi

CONFIG_CONTENT="window.CONFIG = {
  API_BASE_URL: '$API_URL',
  apiEndpoint: '$API_URL',
  EC2_TERMINAL_URL: '$EC2_TERMINAL_URL',
  ENVIRONMENT: '$ENVIRONMENT',
  environment: '$ENVIRONMENT',
  stage: '$STAGE',
  region: 'us-east-1',
  storiesTable: '$STORIES_TABLE',
  acceptanceTestsTable: '$TESTS_TABLE',
  DEBUG: $DEBUG
};"

# Create config-{env}.js
echo "$CONFIG_CONTENT" > apps/frontend/public/config-$ENV.js

# Also create config.js for immediate use
echo "$CONFIG_CONTENT" > apps/frontend/public/config.js

echo "✅ Generated config.js for $ENV environment"
echo "   API: $API_URL"
echo "   Environment: $ENVIRONMENT"
