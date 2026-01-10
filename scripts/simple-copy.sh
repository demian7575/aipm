#!/bin/bash
# Fast DynamoDB table copy using point-in-time restore (fastest method)

set -e
echo "📁 Fast copying DynamoDB tables from production to development..."

REGION="us-east-1"

# Table mappings
declare -A TABLE_MAPPINGS=(
    ["aipm-backend-prod-stories"]="aipm-backend-dev-stories"
    ["aipm-backend-prod-acceptance-tests"]="aipm-backend-dev-acceptance-tests"
    ["aipm-backend-prod-prs"]="aipm-backend-dev-prs"
)

# Function to copy table using point-in-time restore (fastest)
copy_table_fast() {
    local source_table=$1
    local target_table=$2
    
    echo "⚡ Fast copying $source_table -> $target_table..."
    
    # Delete target table if exists
    echo "🗑️ Deleting $target_table..."
    aws dynamodb delete-table --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    aws dynamodb wait table-not-exists --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    
    # Use point-in-time restore (fastest method)
    echo "⚡ Restoring $source_table to $target_table (fastest method)..."
    aws dynamodb restore-table-to-point-in-time \
        --source-table-name "$source_table" \
        --target-table-name "$target_table" \
        --use-latest-restorable-time \
        --region "$REGION" 2>/dev/null || {
        
        echo "⚠️ Point-in-time restore failed, falling back to parallel scan..."
        
        # Fallback: Parallel scan + batch write (fast for small tables)
        aws dynamodb describe-table --table-name "$source_table" --region "$REGION" | \
        jq --arg new_name "$target_table" '
            .Table | 
            {
                TableName: $new_name,
                KeySchema: .KeySchema,
                AttributeDefinitions: .AttributeDefinitions,
                BillingMode: "PAY_PER_REQUEST"
            }
        ' | aws dynamodb create-table --region "$REGION" --cli-input-json file:///dev/stdin
        
        aws dynamodb wait table-exists --table-name "$target_table" --region "$REGION"
        
        # Parallel scan (4 segments for speed)
        for segment in {0..3}; do
            (
                aws dynamodb scan \
                    --table-name "$source_table" \
                    --total-segments 4 \
                    --segment "$segment" \
                    --region "$REGION" | \
                jq -r '.Items[] | @base64' | \
                while read item; do
                    echo "$item" | base64 --decode | \
                    jq -r --arg table "$target_table" '{($table): [{PutRequest: {Item: .}}]}' | \
                    aws dynamodb batch-write-item --region "$REGION" --request-items file:///dev/stdin 2>/dev/null || true
                done
            ) &
        done
        wait
    }
    
    echo "✅ Fast copied $source_table -> $target_table"
}

# Copy all tables
for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    copy_table_fast "$source_table" "$target_table"
done

echo "⚡ Fast DynamoDB copy completed!"
