#!/bin/bash
# Copy DynamoDB tables from production to development by recreating tables

set -e
echo "📁 Copying DynamoDB tables from production to development..."

REGION="us-east-1"

# Table mappings
declare -A TABLE_MAPPINGS=(
    ["aipm-backend-prod-stories"]="aipm-backend-dev-stories"
    ["aipm-backend-prod-acceptance-tests"]="aipm-backend-dev-acceptance-tests"
    ["aipm-backend-prod-prs"]="aipm-backend-dev-prs"
)

# Function to copy table structure and data
copy_table() {
    local source_table=$1
    local target_table=$2
    
    echo "📋 Copying $source_table -> $target_table..."
    
    # Delete target table if it exists
    echo "🗑️ Deleting existing table $target_table..."
    aws dynamodb delete-table --table-name "$target_table" --region "$REGION" 2>/dev/null || echo "Table $target_table doesn't exist, skipping delete"
    
    # Wait for table to be deleted
    echo "⏳ Waiting for table deletion..."
    aws dynamodb wait table-not-exists --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    
    # Get source table description
    echo "📖 Getting table structure from $source_table..."
    aws dynamodb describe-table --table-name "$source_table" --region "$REGION" > /tmp/table_desc.json
    
    # Create target table with same structure
    echo "🏗️ Creating table $target_table..."
    jq --arg new_name "$target_table" '
        .Table | 
        {
            TableName: $new_name,
            KeySchema: .KeySchema,
            AttributeDefinitions: .AttributeDefinitions,
            BillingMode: "PAY_PER_REQUEST"
        }
    ' /tmp/table_desc.json | aws dynamodb create-table --region "$REGION" --cli-input-json file:///dev/stdin
    
    # Wait for table to be active
    echo "⏳ Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$target_table" --region "$REGION"
    
    # Copy data
    echo "📥 Copying data..."
    aws dynamodb scan --table-name "$source_table" --region "$REGION" > /tmp/data.json
    
    # Import data in batches
    jq -r '.Items[] | @base64' /tmp/data.json | \
    while read item; do
        echo "$item" | base64 --decode | \
        jq -r --arg table "$target_table" '{($table): [{PutRequest: {Item: .}}]}' | \
        aws dynamodb batch-write-item --region "$REGION" --request-items file:///dev/stdin || true
    done
    
    # Show count
    local count=$(jq '.Items | length' /tmp/data.json)
    echo "✅ Copied $count items to $target_table"
    
    rm -f /tmp/table_desc.json /tmp/data.json
}

# Copy all tables
for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    copy_table "$source_table" "$target_table"
done

echo "✅ DynamoDB table copy completed!"
