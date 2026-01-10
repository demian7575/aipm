#!/bin/bash
# Copy DynamoDB data from production to development tables

set -e
echo "📁 Copying DynamoDB data from production to development..."

REGION="us-east-1"
PROD_STORIES_TABLE="aipm-backend-prod-stories"
PROD_TESTS_TABLE="aipm-backend-prod-acceptance-tests"
PROD_PRS_TABLE="aipm-backend-prod-prs"

DEV_STORIES_TABLE="aipm-backend-dev-stories"
DEV_TESTS_TABLE="aipm-backend-dev-acceptance-tests"
DEV_PRS_TABLE="aipm-backend-dev-prs"

# Function to copy data between tables
copy_table_data() {
    local source_table=$1
    local target_table=$2
    local temp_file="/tmp/${target_table}.json"
    
    echo "📋 Copying $source_table -> $target_table..."
    
    # Export from source table
    aws dynamodb scan --table-name "$source_table" --region "$REGION" > "$temp_file"
    
    # Clear target table first (optional - comment out if you want to keep existing data)
    echo "🗑️ Clearing target table $target_table..."
    aws dynamodb scan --table-name "$target_table" --region "$REGION" --projection-expression "id" --output json | \
    jq -r '.Items[] | @base64' | \
    while read item; do
        echo "$item" | base64 --decode | \
        jq -r '{DeleteRequest: {Key: {id: .id}}}' | \
        aws dynamodb batch-write-item --region "$REGION" --request-items "{\"$target_table\": [$(cat)]}" || true
    done
    
    # Import to target table
    echo "📥 Importing data to $target_table..."
    jq -r '.Items[] | @base64' "$temp_file" | \
    while read item; do
        echo "$item" | base64 --decode | \
        jq -r '{PutRequest: {Item: .}}' | \
        aws dynamodb batch-write-item --region "$REGION" --request-items "{\"$target_table\": [$(cat)]}" || true
    done
    
    # Show count
    local count=$(jq '.Items | length' "$temp_file")
    echo "✅ Copied $count items to $target_table"
    
    rm -f "$temp_file"
}

# Copy all tables
copy_table_data "$PROD_STORIES_TABLE" "$DEV_STORIES_TABLE"
copy_table_data "$PROD_TESTS_TABLE" "$DEV_TESTS_TABLE"
copy_table_data "$PROD_PRS_TABLE" "$DEV_PRS_TABLE"

echo "✅ DynamoDB data copy completed!"
