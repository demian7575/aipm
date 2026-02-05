#!/bin/bash
# Rollback Migration: Restore snake_case if migration fails

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔙 Rollback Migration"
echo "====================="
echo ""

# Find latest backup
BACKUP_FILE=$(ls -t /tmp/acceptance-tests-backup-*.json 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ No backup file found in /tmp/"
  echo "   Looking for: acceptance-tests-backup-*.json"
  exit 1
fi

echo "Found backup: $BACKUP_FILE"
echo ""
echo "⚠️  This will:"
echo "   1. Restore backend code from .bak file"
echo "   2. Restore data from backup (optional)"
echo "   3. Recreate story_id-index GSI (optional)"
echo ""
echo "Press ENTER to continue or Ctrl+C to abort..."
read -r

# Step 1: Restore code
echo ""
echo "📝 Step 1: Restoring backend code..."

if [ -f "$PROJECT_ROOT/apps/backend/dynamodb.js.bak" ]; then
  cp "$PROJECT_ROOT/apps/backend/dynamodb.js.bak" "$PROJECT_ROOT/apps/backend/dynamodb.js"
  echo "✅ Code restored from backup"
else
  echo "⚠️  No .bak file found - code not restored"
fi

# Step 2: Restore data (optional)
echo ""
echo "📦 Step 2: Restore data from backup?"
echo "   (Only needed if data was corrupted)"
echo "   Restore data? (yes/no)"
read -r RESTORE_DATA

if [ "$RESTORE_DATA" = "yes" ]; then
  echo "   Restoring data..."
  
  # Delete all current items
  echo "   Deleting current items..."
  aws dynamodb scan \
    --table-name aipm-backend-prod-acceptance-tests \
    --region us-east-1 \
    --attributes-to-get id \
    --output json | \
  jq -r '.Items[].id.N' | \
  while read -r ID; do
    aws dynamodb delete-item \
      --table-name aipm-backend-prod-acceptance-tests \
      --region us-east-1 \
      --key "{\"id\": {\"N\": \"$ID\"}}"
  done
  
  # Restore from backup
  echo "   Restoring from backup..."
  jq -c '.Items[]' "$BACKUP_FILE" | while read -r ITEM; do
    aws dynamodb put-item \
      --table-name aipm-backend-prod-acceptance-tests \
      --region us-east-1 \
      --item "$ITEM"
  done
  
  echo "   ✅ Data restored"
else
  echo "   ⏭️  Data restore skipped"
fi

# Step 3: Recreate GSI (optional)
echo ""
echo "🔧 Step 3: Recreate story_id-index GSI?"
echo "   (Only if it was deleted)"
echo "   Recreate GSI? (yes/no)"
read -r RECREATE_GSI

if [ "$RECREATE_GSI" = "yes" ]; then
  echo "   Creating story_id-index GSI..."
  
  aws dynamodb update-table \
    --table-name aipm-backend-prod-acceptance-tests \
    --region us-east-1 \
    --attribute-definitions \
      AttributeName=story_id,AttributeType=N \
    --global-secondary-index-updates \
    "[{
      \"Create\": {
        \"IndexName\": \"story_id-index\",
        \"KeySchema\": [{\"AttributeName\": \"story_id\", \"KeyType\": \"HASH\"}],
        \"Projection\": {\"ProjectionType\": \"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
      }
    }]"
  
  echo "   ⏳ GSI creation in progress..."
  aws dynamodb wait table-exists \
    --table-name aipm-backend-prod-acceptance-tests \
    --region us-east-1
  
  echo "   ✅ GSI recreated"
else
  echo "   ⏭️  GSI recreation skipped"
fi

echo ""
echo "✅ Rollback Complete!"
echo ""
echo "Next steps:"
echo "  1. Deploy restored backend: ./bin/deploy-prod prod skip-tests"
echo "  2. Verify acceptance tests work"
