#!/bin/bash
# Generate config files from central environments.yaml
# Usage: ./scripts/utilities/generate-configs.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../.."

echo "🔧 Generating config files from environments.yaml..."

# Generate production configs
source "$SCRIPT_DIR/load-env-config.sh" production

cat > "$ROOT_DIR/apps/frontend/public/config-prod.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
window.CONFIG = {
  API_BASE_URL: '$API_BASE',
  KIRO_API_URL: '${API_BASE%:*}:8081',
  EC2_TERMINAL_URL: '$TERMINAL_URL',
  ENVIRONMENT: 'production',
  S3_BUCKET: '$S3_BUCKET',
  DYNAMODB_STORIES_TABLE: '$DYNAMODB_STORIES_TABLE',
  DYNAMODB_TESTS_TABLE: '$DYNAMODB_TESTS_TABLE'
};
EOF

cat > "$ROOT_DIR/config/config.prod.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
module.exports = {
  environment: 'production',
  API_BASE_URL: '$API_BASE',
  KIRO_API_URL: '$API_BASE',
  EC2_IP: '$EC2_IP',
  S3_BUCKET: '$S3_BUCKET',
  DYNAMODB_STORIES_TABLE: '$DYNAMODB_STORIES_TABLE',
  DYNAMODB_TESTS_TABLE: '$DYNAMODB_TESTS_TABLE',
  DYNAMODB_PRS_TABLE: '$DYNAMODB_PRS_TABLE'
};
EOF

echo "✅ Generated config-prod.js"

# Generate development configs
source "$SCRIPT_DIR/load-env-config.sh" development

cat > "$ROOT_DIR/apps/frontend/public/config-dev.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
window.CONFIG = {
  API_BASE_URL: '$API_BASE',
  KIRO_API_URL: '${API_BASE%:*}:8081',
  EC2_TERMINAL_URL: '$TERMINAL_URL',
  ENVIRONMENT: 'development',
  S3_BUCKET: '$S3_BUCKET',
  DYNAMODB_STORIES_TABLE: '$DYNAMODB_STORIES_TABLE',
  DYNAMODB_TESTS_TABLE: '$DYNAMODB_TESTS_TABLE'
};
EOF

cat > "$ROOT_DIR/config/config.dev.js" << EOF
// Auto-generated from config/environments.yaml - DO NOT EDIT MANUALLY
module.exports = {
  environment: 'development',
  API_BASE_URL: '$API_BASE',
  KIRO_API_URL: '$API_BASE',
  EC2_IP: '$EC2_IP',
  S3_BUCKET: '$S3_BUCKET',
  DYNAMODB_STORIES_TABLE: '$DYNAMODB_STORIES_TABLE',
  DYNAMODB_TESTS_TABLE: '$DYNAMODB_TESTS_TABLE',
  DYNAMODB_PRS_TABLE: '$DYNAMODB_PRS_TABLE'
};
EOF

echo "✅ Generated config-dev.js"
echo "✅ All config files generated successfully"
