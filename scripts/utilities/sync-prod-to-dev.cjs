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
  console.log('🔄 Starting Prod → Dev sync...');
  
  // Clear dev tables first
  console.log('🗑️ Clearing dev tables...');
  
  const devStories = await client.send(new ScanCommand({
    TableName: 'aipm-backend-dev-stories'
  }));
  if (devStories.Items.length > 0) {
    const deleteRequests = devStories.Items.map(item => ({
      DeleteRequest: { Key: { id: item.id } }
    }));
    for (let i = 0; i < deleteRequests.length; i += 25) {
      await client.send(new BatchWriteItemCommand({
        RequestItems: {
          'aipm-backend-dev-stories': deleteRequests.slice(i, i + 25)
        }
      }));
    }
    console.log(`  Deleted ${devStories.Items.length} stories from dev`);
  }
  
  const devTests = await client.send(new ScanCommand({
    TableName: 'aipm-backend-dev-acceptance-tests'
  }));
  if (devTests.Items.length > 0) {
    const deleteRequests = devTests.Items.map(item => ({
      DeleteRequest: { Key: { id: item.id } }
    }));
    for (let i = 0; i < deleteRequests.length; i += 25) {
      await client.send(new BatchWriteItemCommand({
        RequestItems: {
          'aipm-backend-dev-acceptance-tests': deleteRequests.slice(i, i + 25)
        }
      }));
    }
    console.log(`  Deleted ${devTests.Items.length} tests from dev`);
  }
  
  const devPRs = await client.send(new ScanCommand({
    TableName: 'aipm-backend-dev-prs'
  }));
  if (devPRs.Items.length > 0) {
    const deleteRequests = devPRs.Items.map(item => ({
      DeleteRequest: { Key: { id: item.id } }
    }));
    for (let i = 0; i < deleteRequests.length; i += 25) {
      await client.send(new BatchWriteItemCommand({
        RequestItems: {
          'aipm-backend-dev-prs': deleteRequests.slice(i, i + 25)
        }
      }));
    }
    console.log(`  Deleted ${devPRs.Items.length} PRs from dev`);
  }
  
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
