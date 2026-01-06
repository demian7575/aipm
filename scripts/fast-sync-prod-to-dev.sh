#!/bin/bash
# Fast sync using DynamoDB backup/restore

set -e
echo "🔄 Fast sync using DynamoDB backup/restore..."

REGION="us-east-1"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Function to backup and restore table
sync_table_fast() {
    local source_table=$1
    local target_table=$2
    local description=$3
    
    echo "📋 $description..."
    
    # Create backup of source table
    echo "  💾 Creating backup..."
    local backup_arn=$(aws dynamodb create-backup \
        --table-name "$source_table" \
        --backup-name "${source_table}-sync-${TIMESTAMP}" \
        --region "$REGION" \
        --query 'BackupDetails.BackupArn' \
        --output text)
    
    # Wait for backup to complete
    echo "  ⏳ Waiting for backup..."
    aws dynamodb wait backup-exists --backup-arn "$backup_arn" --region "$REGION"
    
    # Delete target table
    echo "  🗑️  Deleting target table..."
    aws dynamodb delete-table --table-name "$target_table" --region "$REGION" > /dev/null 2>&1 || true
    sleep 10
    
    # Restore backup to target table
    echo "  📥 Restoring to target..."
    aws dynamodb restore-table-from-backup \
        --target-table-name "$target_table" \
        --backup-arn "$backup_arn" \
        --billing-mode-override PAY_PER_REQUEST \
        --region "$REGION" > /dev/null
    
    # Wait for restore
    echo "  ⏳ Waiting for restore..."
    aws dynamodb wait table-exists --table-name "$target_table" --region "$REGION"
    
    # Get count
    local count=$(aws dynamodb scan --table-name "$target_table" --region "$REGION" --select COUNT | jq '.Count')
    echo "  ✅ Restored $count items"
    
    # Cleanup backup
    echo "  🧹 Cleaning up backup..."
    aws dynamodb delete-backup --backup-arn "$backup_arn" --region "$REGION" > /dev/null
}

# Sync all tables
sync_table_fast "aipm-backend-prod-stories" "aipm-backend-dev-stories" "Stories"
sync_table_fast "aipm-backend-prod-acceptance-tests" "aipm-backend-dev-acceptance-tests" "Acceptance Tests"
sync_table_fast "aipm-backend-prod-prs" "aipm-backend-dev-prs" "PRs"

echo "🎉 Fast sync completed!"
