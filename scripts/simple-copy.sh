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
        split -l 25 /tmp/${target_table}_keys.txt /tmp/delete_${target_table}_batch_
        for batch_file in /tmp/delete_${target_table}_batch_*; do
            if [ -s "$batch_file" ]; then
                echo "{\"$target_table\": [" > /tmp/delete_request.json
                first=true
                while read key_data; do
                    if [ -n "$key_data" ]; then  # Check if key_data is not empty
                        if [ "$first" = true ]; then
                            first=false
                        else
                            echo "," >> /tmp/delete_request.json
                        fi
                        echo "$key_data" | base64 --decode | \
                        jq -r '{DeleteRequest: {Key: {id: .id}}}' >> /tmp/delete_request.json 2>/dev/null || continue
                    fi
                done < "$batch_file"
                echo "]}" >> /tmp/delete_request.json
                
                # Only send if we have valid items
                if [ "$first" = false ]; then
                    aws dynamodb batch-write-item \
                        --region "$REGION" \
                        --request-items file:///tmp/delete_request.json 2>/dev/null || true
                fi
                rm "$batch_file"
            fi
        done
    fi
    
    # 4. Batch insert new data (25 items per batch)
    echo "📥 Batch inserting new data..."
    if [ -s /tmp/${source_table}_data.txt ]; then
<<<<<<< HEAD
        split -l 25 /tmp/${source_table}_data.txt /tmp/insert_batch_
        for batch_file in /tmp/insert_batch_*; do
            if [ -s "$batch_file" ]; then
                echo "{\"$target_table\": [" > /tmp/insert_request.json
                first=true
                while read item_data; do
                    if [ -n "$item_data" ]; then  # Check if item_data is not empty
                        if [ "$first" = true ]; then
                            first=false
                        else
                            echo "," >> /tmp/insert_request.json
                        fi
                        echo "$item_data" | base64 --decode | \
                        jq -r '{PutRequest: {Item: .}}' >> /tmp/insert_request.json 2>/dev/null || continue
                    fi
                done < "$batch_file"
                echo "]}" >> /tmp/insert_request.json
                
                # Only send if we have valid items
                if [ "$first" = false ]; then
                    aws dynamodb batch-write-item \
                        --region "$REGION" \
                        --request-items file:///tmp/insert_request.json 2>/dev/null || true
=======
        split -l 25 /tmp/${source_table}_data.txt /tmp/insert_${source_table}_batch_
        for batch_file in /tmp/insert_${source_table}_batch_*; do
            if [ -s "$batch_file" ]; then
                # Build JSON array properly
                items=()
                while read item_data; do
                    if [ -n "$item_data" ]; then
                        item_json=$(echo "$item_data" | base64 --decode | jq -c '{PutRequest: {Item: .}}' 2>/dev/null)
                        if [ -n "$item_json" ]; then
                            items+=("$item_json")
                        fi
                    fi
                done < "$batch_file"
                
                # Only send if we have valid items
                if [ ${#items[@]} -gt 0 ]; then
                    # Create proper JSON array
                    printf '{"'$target_table'": [' > /tmp/insert_request.json
                    for i in "${!items[@]}"; do
                        if [ $i -gt 0 ]; then printf ',' >> /tmp/insert_request.json; fi
                        printf '%s' "${items[$i]}" >> /tmp/insert_request.json
                    done
                    printf ']}' >> /tmp/insert_request.json
                    
                    echo "📤 Sending batch insert (${#items[@]} items)..."
                    RESULT=$(aws dynamodb batch-write-item \
                        --region "$REGION" \
                        --request-items file:///tmp/insert_request.json 2>&1)
                    if echo "$RESULT" | grep -q "UnprocessedItems"; then
                        echo "✅ Batch insert successful"
                    else
                        echo "❌ Batch insert failed: $RESULT"
                    fi
>>>>>>> test-ultra-fast-copy-1768095693
                fi
                rm "$batch_file" 2>/dev/null || true
            fi
        done
    fi
    
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
