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

async function clearTable(tableName, keyName = 'id') {
  const items = await client.send(new ScanCommand({ TableName: tableName }));
  if (items.Items.length === 0) return 0;
  
  const deleteRequests = items.Items.map(item => ({
    DeleteRequest: { Key: { [keyName]: item[keyName] } }
  }));
  
  for (let i = 0; i < deleteRequests.length; i += 25) {
    await client.send(new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: deleteRequests.slice(i, i + 25)
      }
    }));
  }
  
  return items.Items.length;
}

async function copyTable(sourceTable, targetTable) {
  const items = await client.send(new ScanCommand({ TableName: sourceTable }));
  await batchWrite(targetTable, items.Items);
  return items.Items.length;
}

async function sync() {
  console.log('🔄 Starting Prod → Dev sync...');
  
  const tables = [
    { source: 'aipm-backend-prod-stories', target: 'aipm-backend-dev-stories', name: 'stories' },
    { source: 'aipm-backend-prod-acceptance-tests', target: 'aipm-backend-dev-acceptance-tests', name: 'tests' },
    { source: 'aipm-backend-prod-prs', target: 'aipm-backend-dev-prs', name: 'PRs' }
  ];
  
  // Clear all dev tables in parallel
  console.log('🗑️ Clearing dev tables...');
  const clearResults = await Promise.all(
    tables.map(t => clearTable(t.target).then(count => ({ name: t.name, count })))
  );
  clearResults.forEach(r => console.log(`  Deleted ${r.count} ${r.name} from dev`));
  
  // Copy all prod tables to dev in parallel
  console.log('📥 Syncing from prod...');
  const syncResults = await Promise.all(
    tables.map(t => copyTable(t.source, t.target).then(count => ({ name: t.name, count })))
  );
  syncResults.forEach(r => console.log(`✅ ${r.count} ${r.name} synced`));
}

sync().catch(console.error);
