#!/usr/bin/env node
const { DynamoDBClient, ScanCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });

async function batchWrite(tableName, items) {
  const BATCH_SIZE = 25; // DynamoDB limit
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const requests = batch.map(item => ({
      PutRequest: { Item: item }
    }));
    
    await client.send(new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: requests
      }
    }));
  }
}

async function sync() {
  // Scan prod stories
  const stories = await client.send(new ScanCommand({
    TableName: 'aipm-backend-prod-stories'
  }));
  
  console.log(`Syncing ${stories.Items.length} stories...`);
  await batchWrite('aipm-backend-dev-stories', stories.Items);
  console.log('✅ Stories synced');
  
  // Scan prod tests
  const tests = await client.send(new ScanCommand({
    TableName: 'aipm-backend-prod-acceptance-tests'
  }));
  
  console.log(`Syncing ${tests.Items.length} tests...`);
  await batchWrite('aipm-backend-dev-acceptance-tests', tests.Items);
  console.log('✅ Tests synced');
  
  // Scan prod PRs
  const prs = await client.send(new ScanCommand({
    TableName: 'aipm-backend-prod-prs'
  }));
  
  console.log(`Syncing ${prs.Items.length} PRs...`);
  await batchWrite('aipm-backend-dev-prs', prs.Items);
  console.log('✅ PRs synced');
}

sync().catch(console.error);
