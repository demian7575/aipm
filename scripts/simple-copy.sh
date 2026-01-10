#!/bin/bash
# Ultra-fast DynamoDB copy using batch delete+insert (no table recreation)

set -e
echo "🚀 Ultra-fast DynamoDB copy using batch operations..."

REGION="us-east-1"

declare -A TABLE_MAPPINGS=(
    ["aipm-backend-prod-stories"]="aipm-backend-dev-stories"
    ["aipm-backend-prod-acceptance-tests"]="aipm-backend-dev-acceptance-tests"
    ["aipm-backend-prod-prs"]="aipm-backend-dev-prs"
)

batch_copy() {
    local source_table=$1
    local target_table=$2
    
    echo "🚀 Batch copying: $source_table -> $target_table"
    
    # 1. Get all keys from target table for deletion
    echo "🔍 Collecting existing data keys..."
    aws dynamodb scan \
        --table-name "$target_table" \
        --projection-expression "id" \
        --region "$REGION" 2>/dev/null | \
    jq -r '.Items[] | @base64' > /tmp/${target_table}_keys.txt || touch /tmp/${target_table}_keys.txt
    
    # 2. Get source data
    echo "📊 Collecting source data..."
    aws dynamodb scan \
        --table-name "$source_table" \
        --region "$REGION" | \
    jq -r '.Items[] | @base64' > /tmp/${source_table}_data.txt
    
    # 3. Batch delete existing data (25 items per batch)
    if [ -s /tmp/${target_table}_keys.txt ]; then
        echo "🗑️ Batch deleting existing data..."
        split -l 25 /tmp/${target_table}_keys.txt /tmp/delete_batch_
        for batch_file in /tmp/delete_batch_*; do
            if [ -s "$batch_file" ]; then
                echo "{\"$target_table\": [" > /tmp/delete_request.json
                first=true
                while read key_data; do
                    if [ "$first" = true ]; then
                        first=false
                    else
                        echo "," >> /tmp/delete_request.json
                    fi
                    echo "$key_data" | base64 --decode | \
                    jq -r '{DeleteRequest: {Key: {id: .id}}}' >> /tmp/delete_request.json
                done < "$batch_file"
                echo "]}" >> /tmp/delete_request.json
                
                aws dynamodb batch-write-item \
                    --region "$REGION" \
                    --request-items file:///tmp/delete_request.json 2>/dev/null || true
                rm "$batch_file"
            fi
        done
    fi
    
    # 4. Batch insert new data (25 items per batch)
    echo "📥 Batch inserting new data..."
    split -l 25 /tmp/${source_table}_data.txt /tmp/insert_batch_
    for batch_file in /tmp/insert_batch_*; do
        if [ -s "$batch_file" ]; then
            echo "{\"$target_table\": [" > /tmp/insert_request.json
            first=true
            while read item_data; do
                if [ "$first" = true ]; then
                    first=false
                else
                    echo "," >> /tmp/insert_request.json
                fi
                echo "$item_data" | base64 --decode | \
                jq -r '{PutRequest: {Item: .}}' >> /tmp/insert_request.json
            done < "$batch_file"
            echo "]}" >> /tmp/insert_request.json
            
            aws dynamodb batch-write-item \
                --region "$REGION" \
                --request-items file:///tmp/insert_request.json 2>/dev/null || true
            rm "$batch_file" 2>/dev/null || true
        fi
    done
    
    # 5. Cleanup temp files
    rm -f /tmp/${target_table}_keys.txt /tmp/${source_table}_data.txt
    rm -f /tmp/delete_request.json /tmp/insert_request.json
    
    echo "✅ Completed: $source_table -> $target_table"
}

# Process all tables in parallel
for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    batch_copy "$source_table" "$target_table" &
done
wait

echo "🚀 Ultra-fast DynamoDB copy completed!"
