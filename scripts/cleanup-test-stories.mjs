#!/usr/bin/env node
/**
 * Cleanup test stories created during gating tests
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const STORIES_TABLE = 'aipm-backend-prod-stories';

const client = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(client);

// Test story patterns (excluding "Test Root" which should be preserved)
const TEST_PATTERNS = [
  /^Test$/i,
  /Test Story$/i,
  /Test Feature/i,
  /Phase\d+ /i,
  /Perf Test/i,
  /Lifecycle Test/i,
  /Persistence Test/i,
  /Sync Test/i,
  /Draft Test/i,
  /Child Test/i,
  /Parent Test/i,
  /Code Gen Test/i
];

const PROTECTED_TITLES = ['Test Root'];

async function cleanupTestStories() {
  console.log('🧹 Cleaning up test stories...\n');
  
  // Scan all stories
  const { Items = [] } = await dynamodb.send(new ScanCommand({
    TableName: STORIES_TABLE
  }));
  
  console.log(`📊 Found ${Items.length} total stories\n`);
  
  // Find test stories (excluding protected titles)
  const testStories = Items.filter(item => {
    const title = item.title || '';
    
    // Protect specific titles
    if (PROTECTED_TITLES.includes(title)) {
      return false;
    }
    
    return TEST_PATTERNS.some(pattern => pattern.test(title));
  });
  
  console.log(`🎯 Found ${testStories.length} test stories to delete:\n`);
  
  // Show what will be deleted
  testStories.forEach(story => {
    console.log(`  - ${story.id}: ${story.title}`);
  });
  
  if (testStories.length === 0) {
    console.log('\n✅ No test stories to delete');
    return;
  }
  
  console.log(`\n⚠️  About to delete ${testStories.length} stories`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Delete stories
  let deleted = 0;
  let errors = 0;
  
  for (const story of testStories) {
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
  console.log(`📈 Total processed: ${testStories.length}`);
  
  if (errors === 0) {
    console.log('\n🎉 Cleanup completed successfully!');
  } else {
    console.log('\n⚠️  Cleanup completed with errors');
  }
}

cleanupTestStories().catch(error => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});
