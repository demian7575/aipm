#!/usr/bin/env node
const { DynamoDBClient, ScanCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });

async function sync() {
  // Scan prod stories
  const stories = await client.send(new ScanCommand({
    TableName: 'aipm-backend-prod-stories'
  }));
  
  console.log(`Syncing ${stories.Items.length} stories...`);
  
  for (const item of stories.Items) {
    await client.send(new PutItemCommand({
      TableName: 'aipm-backend-dev-stories',
      Item: item
    }));
  }
  
  console.log('✅ Stories synced');
  
  // Scan prod tests
  const tests = await client.send(new ScanCommand({
    TableName: 'aipm-backend-prod-acceptance-tests'
  }));
  
  console.log(`Syncing ${tests.Items.length} tests...`);
  
  for (const item of tests.Items) {
    await client.send(new PutItemCommand({
      TableName: 'aipm-backend-dev-acceptance-tests',
      Item: item
    }));
  }
  
  console.log('✅ Tests synced');
}

sync().catch(console.error);
