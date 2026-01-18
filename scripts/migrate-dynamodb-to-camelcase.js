#!/usr/bin/env node
// Migrate DynamoDB acceptance tests from snake_case to camelCase

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'aipm-backend-prod-acceptance-tests';

async function migrateTests() {
  console.log('Scanning for tests with snake_case fields...');
  
  const result = await docClient.send(new ScanCommand({
    TableName: tableName
  }));
  
  const items = result.Items || [];
  console.log(`Found ${items.length} total items`);
  
  let migrated = 0;
  
  for (const item of items) {
    // Check if item has snake_case fields
    if (item.story_id || item.when_step || item.then_step || item.created_at || item.updated_at) {
      console.log(`Migrating item ${item.id}...`);
      
      const newItem = {
        id: item.id,
        storyId: item.story_id || item.storyId,
        title: item.title,
        given: item.given,
        whenStep: item.when_step || item.whenStep,
        thenStep: item.then_step || item.thenStep,
        status: item.status,
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt
      };
      
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: newItem
      }));
      
      migrated++;
    }
  }
  
  console.log(`Migration complete! Migrated ${migrated} items.`);
}

migrateTests().catch(console.error);
