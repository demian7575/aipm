#!/bin/bash
# Ultra-fast DynamoDB copy with maximum parallelization

set -e
echo "🚀 Ultra-fast DynamoDB table copy..."

REGION="us-east-1"
MAX_PARALLEL=16  # Increase parallel segments

declare -A TABLE_MAPPINGS=(
    ["aipm-backend-prod-stories"]="aipm-backend-dev-stories"
    ["aipm-backend-prod-acceptance-tests"]="aipm-backend-dev-acceptance-tests"
    ["aipm-backend-prod-prs"]="aipm-backend-dev-prs"
)

ultra_fast_copy() {
    local source_table=$1
    local target_table=$2
    
    echo "🚀 Ultra-fast copying $source_table -> $target_table..."
    
    # Delete and recreate target table
    aws dynamodb delete-table --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    aws dynamodb wait table-not-exists --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    
    # Create target table with higher provisioned capacity for faster writes
    aws dynamodb describe-table --table-name "$source_table" --region "$REGION" | \
    jq --arg new_name "$target_table" '
        .Table | 
        {
            TableName: $new_name,
            KeySchema: .KeySchema,
            AttributeDefinitions: .AttributeDefinitions,
            BillingMode: "PROVISIONED",
            ProvisionedThroughput: {
                ReadCapacityUnits: 1000,
                WriteCapacityUnits: 1000
            }
        }
    ' | aws dynamodb create-table --region "$REGION" --cli-input-json file:///dev/stdin
    
    aws dynamodb wait table-exists --table-name "$target_table" --region "$REGION"
    
    # Ultra-parallel scan with maximum segments
    for segment in $(seq 0 $((MAX_PARALLEL-1))); do
        (
            aws dynamodb scan \
                --table-name "$source_table" \
                --total-segments "$MAX_PARALLEL" \
                --segment "$segment" \
                --region "$REGION" \
                --max-items 1000 | \
            jq -c '.Items[]' | \
            split -l 25 - /tmp/batch_${segment}_ && \
            for batch_file in /tmp/batch_${segment}_*; do
                if [ -s "$batch_file" ]; then
                    jq -s --arg table "$target_table" '{($table): [.[] | {PutRequest: {Item: .}}]}' "$batch_file" | \
                    aws dynamodb batch-write-item --region "$REGION" --request-items file:///dev/stdin 2>/dev/null || true
                    rm "$batch_file"
                fi
            done
        ) &
    done
    wait
    
    # Switch back to on-demand billing
    aws dynamodb modify-table \
        --table-name "$target_table" \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION" >/dev/null
    
    echo "✅ Ultra-fast copied $source_table -> $target_table"
}

# Copy all tables in parallel
for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    ultra_fast_copy "$source_table" "$target_table" &
done
wait

echo "🚀 Ultra-fast DynamoDB copy completed!"
