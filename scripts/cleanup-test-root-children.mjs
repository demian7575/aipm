#!/usr/bin/env node
/**
 * Cleanup all child stories under Test Root
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const STORIES_TABLE = 'aipm-backend-prod-stories';

const client = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(client);

async function cleanupTestRootChildren() {
  console.log('🧹 Cleaning up Test Root children...\n');
  
  // Scan all stories
  const { Items = [] } = await dynamodb.send(new ScanCommand({
    TableName: STORIES_TABLE
  }));
  
  // Find Test Root
  const testRoot = Items.find(item => item.title === 'Test Root');
  
  if (!testRoot) {
    console.log('❌ Test Root not found');
    return;
  }
  
  console.log(`✅ Found Test Root (ID: ${testRoot.id})\n`);
  
  // Find all children of Test Root
  const children = Items.filter(item => item.parentId === testRoot.id);
  
  console.log(`📊 Found ${children.length} child stories to delete:\n`);
  
  if (children.length === 0) {
    console.log('✅ No child stories to delete');
    return;
  }
  
  // Show what will be deleted
  children.forEach(story => {
    console.log(`  - ${story.id}: ${story.title}`);
  });
  
  console.log(`\n⚠️  About to delete ${children.length} stories`);
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Delete stories
  let deleted = 0;
  let errors = 0;
  
  for (const story of children) {
    try {
      await dynamodb.send(new DeleteCommand({
        TableName: STORIES_TABLE,
        Key: { id: story.id }
      }));
      deleted++;
      console.log(`  ✅ Deleted: ${story.id} - ${story.title}`);
    } catch (error) {
      errors++;
      console.error(`  ❌ Error deleting ${story.id}:`, error.message);
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CLEANUP SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Deleted: ${deleted}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`🌳 Test Root preserved: ${testRoot.id}`);
  
  if (errors === 0) {
    console.log('\n🎉 Cleanup completed successfully!');
  } else {
    console.log('\n⚠️  Cleanup completed with errors');
  }
}

cleanupTestRootChildren().catch(error => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});
