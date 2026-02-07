#!/usr/bin/env node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'aipm-backend-prod-stories';

async function updateEmptyInvestFields() {
  console.log('🔍 Scanning for stories with empty INVEST fields...\n');
  
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME
  }));
  
  const emptyStories = result.Items.filter(story => 
    (!story.asA || story.asA === '') &&
    (!story.iWant || story.iWant === '') &&
    (!story.soThat || story.soThat === '')
  );
  
  console.log(`Found ${emptyStories.length} stories to update\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const story of emptyStories) {
    const title = story.title || 'Untitled';
    console.log(`[${updated + failed + 1}/${emptyStories.length}] ${title} (ID: ${story.id})`);
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: story.id },
        UpdateExpression: 'SET asA = :asA, iWant = :iWant, soThat = :soThat',
        ExpressionAttributeValues: {
          ':asA': 'product manager',
          ':iWant': `to ${title.toLowerCase()}`,
          ':soThat': 'I can manage requirements effectively'
        }
      }));
      console.log('  ✅ Updated\n');
      updated++;
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('=========================================');
  console.log(`Summary:`);
  console.log(`  Total: ${emptyStories.length}`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('=========================================');
}

updateEmptyInvestFields().catch(console.error);
