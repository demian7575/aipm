#!/bin/bash
# Generate config files from central environments.yaml
# Usage: ./scripts/utilities/generate-configs.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."

echo "🔧 Generating config files from environments.yaml..."

# Generate production configs
source "$SCRIPT_DIR/load-env-config.sh" prod

cat > "$ROOT_DIR/apps/frontend/public/config-prod.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
window.CONFIG = {
  api_url: '$API_BASE',
  semantic_api_url: '$SEMANTIC_API_BASE',
  session_pool_url: '$SESSION_POOL_URL',
  API_BASE_URL: '$API_BASE',
  EC2_TERMINAL_URL: '$TERMINAL_URL',
  ENVIRONMENT: 'prod'
};
EOF

cat > "$ROOT_DIR/config/config.prod.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
module.exports = {
  environment: 'prod',
  API_BASE_URL: '$API_BASE',
  SEMANTIC_API_URL: '$SEMANTIC_API_BASE',
  EC2_IP: '$EC2_IP',
  S3_BUCKET: '$S3_BUCKET',
  DYNAMODB_STORIES_TABLE: '$DYNAMODB_STORIES_TABLE',
  DYNAMODB_TESTS_TABLE: '$DYNAMODB_TESTS_TABLE',
  DYNAMODB_PRS_TABLE: '$DYNAMODB_PRS_TABLE'
};
EOF

echo "✅ Generated config-prod.js"

# Generate development configs
source "$SCRIPT_DIR/load-env-config.sh" dev

cat > "$ROOT_DIR/apps/frontend/public/config-dev.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
window.CONFIG = {
  api_url: '$API_BASE',
  semantic_api_url: '$SEMANTIC_API_BASE',
  session_pool_url: '$SESSION_POOL_URL',
  API_BASE_URL: '$API_BASE',
  EC2_TERMINAL_URL: '$TERMINAL_URL',
  ENVIRONMENT: 'dev'
};
EOF

cat > "$ROOT_DIR/config/config.dev.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
module.exports = {
  environment: 'dev',
  API_BASE_URL: '$API_BASE',
  SEMANTIC_API_URL: '$SEMANTIC_API_BASE',
  EC2_IP: '$EC2_IP',
  S3_BUCKET: '$S3_BUCKET',
  DYNAMODB_STORIES_TABLE: '$DYNAMODB_STORIES_TABLE',
  DYNAMODB_TESTS_TABLE: '$DYNAMODB_TESTS_TABLE',
  DYNAMODB_PRS_TABLE: '$DYNAMODB_PRS_TABLE'
};
EOF

echo "✅ Generated config-dev.js"
echo "✅ All config files generated successfully"
