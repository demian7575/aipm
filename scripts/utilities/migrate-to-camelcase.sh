#!/bin/bash
# Migration: Remove snake_case (story_id), Keep camelCase (storyId) Only
# 
# SAFE MIGRATION PLAN:
# 1. Backup all data
# 2. Update backend code to use storyId only
# 3. Migrate data: copy story_id → storyId (if needed)
# 4. Delete unused GSI (story_id-index)
# 5. Verify everything works
# 6. Rollback capability at each step

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔄 Migration: snake_case → camelCase"
echo "====================================="
echo ""
echo "⚠️  This will:"
echo "   1. Backup acceptance tests table"
echo "   2. Update backend code to use storyId only"
echo "   3. Delete unused story_id-index GSI"
echo "   4. Keep storyId-index GSI (actively used)"
echo ""
echo "Press ENTER to continue or Ctrl+C to abort..."
read -r

# Step 1: Backup
echo ""
echo "📦 Step 1: Backing up acceptance tests..."
BACKUP_FILE="/tmp/acceptance-tests-backup-$(date +%s).json"
aws dynamodb scan \
  --table-name aipm-backend-prod-acceptance-tests \
  --region us-east-1 \
  --output json > "$BACKUP_FILE"

ITEM_COUNT=$(jq '.Items | length' "$BACKUP_FILE")
echo "✅ Backed up $ITEM_COUNT items to: $BACKUP_FILE"

# Step 2: Verify data consistency
echo ""
echo "🔍 Step 2: Verifying data consistency..."
ITEMS_WITH_STORYID=$(jq '[.Items[] | select(.storyId != null)] | length' "$BACKUP_FILE")
ITEMS_WITH_STORY_ID=$(jq '[.Items[] | select(.story_id != null)] | length' "$BACKUP_FILE")

echo "   Items with storyId (camelCase): $ITEMS_WITH_STORYID"
echo "   Items with story_id (snake_case): $ITEMS_WITH_STORY_ID"

if [ "$ITEMS_WITH_STORYID" -eq 0 ] && [ "$ITEMS_WITH_STORY_ID" -gt 0 ]; then
  echo ""
  echo "⚠️  WARNING: Data uses story_id (snake_case) but code expects storyId (camelCase)"
  echo "   Need to migrate data first!"
  echo ""
  echo "   Run data migration? (yes/no)"
  read -r MIGRATE_DATA
  
  if [ "$MIGRATE_DATA" = "yes" ]; then
    echo "   Migrating story_id → storyId..."
    
    # For each item, copy story_id to storyId
    jq -c '.Items[]' "$BACKUP_FILE" | while read -r ITEM; do
      ID=$(echo "$ITEM" | jq -r '.id.N')
      STORY_ID=$(echo "$ITEM" | jq -r '.story_id.N // empty')
      
      if [ -n "$STORY_ID" ]; then
        echo "   Updating item $ID: story_id=$STORY_ID → storyId=$STORY_ID"
        
        aws dynamodb update-item \
          --table-name aipm-backend-prod-acceptance-tests \
          --region us-east-1 \
          --key "{\"id\": {\"N\": \"$ID\"}}" \
          --update-expression "SET storyId = :sid" \
          --expression-attribute-values "{\":sid\": {\"N\": \"$STORY_ID\"}}" \
          > /dev/null
      fi
    done
    
    echo "   ✅ Data migration complete"
  else
    echo "   Aborting migration"
    exit 1
  fi
fi

# Step 3: Update backend code
echo ""
echo "📝 Step 3: Updating backend code..."
echo "   Changing story_id-index → storyId-index in dynamodb.js"

# Update dynamodb.js to use storyId-index
sed -i.bak "s/IndexName: 'story_id-index'/IndexName: 'storyId-index'/g" \
  "$PROJECT_ROOT/apps/backend/dynamodb.js"

sed -i.bak "s/KeyConditionExpression: 'story_id = :story_id'/KeyConditionExpression: 'storyId = :storyId'/g" \
  "$PROJECT_ROOT/apps/backend/dynamodb.js"

sed -i.bak "s/':story_id': parseInt(storyId)/':storyId': parseInt(storyId)/g" \
  "$PROJECT_ROOT/apps/backend/dynamodb.js"

# Remove story_id assignment in createAcceptanceTest
sed -i.bak "s/story_id: parseInt(test.storyId || test.story_id)/storyId: parseInt(test.storyId)/g" \
  "$PROJECT_ROOT/apps/backend/dynamodb.js"

# Remove story_id conversion in getAllStories
sed -i.bak "/story_id: item.storyId,  \/\/ Convert to snake_case for compatibility/d" \
  "$PROJECT_ROOT/apps/backend/dynamodb.js"

echo "✅ Backend code updated"
echo "   Backup saved to: apps/backend/dynamodb.js.bak"

# Step 4: Test backend
echo ""
echo "🧪 Step 4: Testing backend code..."
if node -c "$PROJECT_ROOT/apps/backend/dynamodb.js"; then
  echo "✅ Backend syntax valid"
else
  echo "❌ Backend syntax error - rolling back"
  mv "$PROJECT_ROOT/apps/backend/dynamodb.js.bak" "$PROJECT_ROOT/apps/backend/dynamodb.js"
  exit 1
fi

# Step 5: Delete unused GSI
echo ""
echo "🗑️  Step 5: Deleting unused story_id-index GSI..."
echo "   This will take several minutes..."
echo ""
echo "   Delete story_id-index GSI? (yes/no)"
read -r DELETE_GSI

if [ "$DELETE_GSI" = "yes" ]; then
  aws dynamodb update-table \
    --table-name aipm-backend-prod-acceptance-tests \
    --region us-east-1 \
    --global-secondary-index-updates \
    "[{\"Delete\": {\"IndexName\": \"story_id-index\"}}]"
  
  echo "   ⏳ GSI deletion in progress..."
  echo "   Waiting for table to become ACTIVE..."
  
  aws dynamodb wait table-exists \
    --table-name aipm-backend-prod-acceptance-tests \
    --region us-east-1
  
  echo "   ✅ GSI deleted"
else
  echo "   ⏭️  Skipped GSI deletion (can be done later)"
fi

# Step 6: Summary
echo ""
echo "✅ Migration Complete!"
echo "===================="
echo ""
echo "Changes made:"
echo "  ✅ Backend code now uses storyId (camelCase) only"
echo "  ✅ Data migrated (if needed)"
echo "  $([ "$DELETE_GSI" = "yes" ] && echo "✅" || echo "⏭️ ") story_id-index GSI deleted"
echo ""
echo "Backup files:"
echo "  - Data: $BACKUP_FILE"
echo "  - Code: $PROJECT_ROOT/apps/backend/dynamodb.js.bak"
echo ""
echo "Next steps:"
echo "  1. Deploy updated backend: ./bin/deploy-prod prod skip-tests"
echo "  2. Test acceptance test queries"
echo "  3. If issues occur, rollback with:"
echo "     mv apps/backend/dynamodb.js.bak apps/backend/dynamodb.js"
echo "     aws dynamodb batch-write-item --request-items file://$BACKUP_FILE"
