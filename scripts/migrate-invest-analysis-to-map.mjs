#!/usr/bin/env node
/**
 * Migration Script: Convert invest_analysis from JSON string to DynamoDB Map
 * 
 * This script migrates the invest_analysis field from a JSON string to a native
 * DynamoDB Map type, which:
 * - Eliminates JSON parsing errors
 * - Enables querying and filtering
 * - Prevents shell escaping issues
 * - Improves type safety
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLES = [
  'aipm-backend-prod-stories',
  'aipm-backend-dev-stories'
];

const client = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(client);

async function migrateTable(tableName) {
  console.log(`\n🔄 Migrating table: ${tableName}`);
  
  try {
    // Scan all items
    const { Items = [] } = await dynamodb.send(new ScanCommand({
      TableName: tableName
    }));
    
    console.log(`📊 Found ${Items.length} stories`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const item of Items) {
      try {
        // Check if invest_analysis is a string (needs migration)
        if (typeof item.invest_analysis === 'string') {
          // Parse the JSON string
          const parsed = JSON.parse(item.invest_analysis);
          
          // Update with Map object
          await dynamodb.send(new UpdateCommand({
            TableName: tableName,
            Key: { id: item.id },
            UpdateExpression: 'SET invest_analysis = :analysis',
            ExpressionAttributeValues: {
              ':analysis': parsed
            }
          }));
          
          migrated++;
          console.log(`  ✅ Migrated story ${item.id}`);
        } else if (typeof item.invest_analysis === 'object') {
          skipped++;
          console.log(`  ⏭️  Story ${item.id} already migrated`);
        } else {
          skipped++;
          console.log(`  ⏭️  Story ${item.id} has no invest_analysis`);
        }
      } catch (error) {
        errors++;
        console.error(`  ❌ Error migrating story ${item.id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Migration Summary for ${tableName}:`);
    console.log(`  ✅ Migrated: ${migrated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    
    return { migrated, skipped, errors };
  } catch (error) {
    console.error(`❌ Failed to migrate table ${tableName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting invest_analysis migration to DynamoDB Map type');
  console.log(`📍 Region: ${REGION}`);
  
  const results = {
    totalMigrated: 0,
    totalSkipped: 0,
    totalErrors: 0
  };
  
  for (const tableName of TABLES) {
    try {
      const result = await migrateTable(tableName);
      results.totalMigrated += result.migrated;
      results.totalSkipped += result.skipped;
      results.totalErrors += result.errors;
    } catch (error) {
      console.error(`⚠️  Skipping table ${tableName} due to error`);
      results.totalErrors++;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL MIGRATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Total Migrated: ${results.totalMigrated}`);
  console.log(`⏭️  Total Skipped: ${results.totalSkipped}`);
  console.log(`❌ Total Errors: ${results.totalErrors}`);
  
  if (results.totalErrors === 0) {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Migration completed with errors');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
