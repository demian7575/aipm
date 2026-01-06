#!/bin/bash
# Snapshot whole DB using Point-in-Time Recovery

set -e
echo "📸 Creating DB snapshot for development deployment..."

REGION="us-east-1"
RESTORE_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")

# Function to snapshot table using PITR
snapshot_table() {
    local source_table=$1
    local target_table=$2
    local description=$3
    
    echo "📋 $description..."
    
    # Delete target table
    echo "  🗑️  Deleting $target_table..."
    aws dynamodb delete-table --table-name "$target_table" --region "$REGION" > /dev/null 2>&1 || true
    sleep 5
    
    # Restore from point-in-time (creates snapshot)
    echo "  📸 Restoring snapshot at $RESTORE_TIME..."
    aws dynamodb restore-table-to-point-in-time \
        --source-table-name "$source_table" \
        --target-table-name "$target_table" \
        --restore-date-time "$RESTORE_TIME" \
        --billing-mode-override PAY_PER_REQUEST \
        --region "$REGION" > /dev/null
    
    # Wait for restore
    echo "  ⏳ Waiting for snapshot restore..."
    aws dynamodb wait table-exists --table-name "$target_table" --region "$REGION"
    
    local count=$(aws dynamodb scan --table-name "$target_table" --region "$REGION" --select COUNT | jq '.Count')
    echo "  ✅ Snapshot restored: $count items"
}

# Snapshot all tables at the same point in time
snapshot_table "aipm-backend-prod-stories" "aipm-backend-dev-stories" "Stories"
snapshot_table "aipm-backend-prod-acceptance-tests" "aipm-backend-dev-acceptance-tests" "Acceptance Tests"
snapshot_table "aipm-backend-prod-prs" "aipm-backend-dev-prs" "PRs"

echo "🎉 DB snapshot completed at $RESTORE_TIME"
