#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';

const rootIds = [1000, 2000, 3000, 4000, 5000, 6000];

async function fixRoots() {
  console.log('🔧 Fixing root stories...\n');
  
  for (const id of rootIds) {
    await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id },
      UpdateExpression: 'REMOVE parentId',
      ConditionExpression: 'attribute_exists(id)'
    }));
    console.log(`✅ Fixed: ${id} - removed parentId`);
  }
  
  console.log('\n✅ All root stories fixed!');
}

fixRoots().catch(console.error);
