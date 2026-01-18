#!/usr/bin/env node
// Migrate DynamoDB stories from snake_case to camelCase

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'aipm-backend-prod-stories';

async function migrateStories() {
  console.log('Scanning for stories with snake_case fields...');
  
  const result = await docClient.send(new ScanCommand({
    TableName: tableName
  }));
  
  const items = result.Items || [];
  console.log(`Found ${items.length} total items`);
  
  let migrated = 0;
  
  for (const item of items) {
    // Check if item has snake_case fields
    if (item.parent_id || item.as_a || item.i_want || item.so_that || 
        item.story_point || item.assignee_email || item.created_at || 
        item.updated_at || item.mr_id || item.invest_warnings || item.invest_analysis) {
      console.log(`Migrating story ${item.id}: ${item.title}...`);
      
      const newItem = {
        id: item.id,
        mrId: item.mr_id || item.mrId || 1,
        title: item.title,
        description: item.description,
        asA: item.as_a || item.asA || '',
        iWant: item.i_want || item.iWant || '',
        soThat: item.so_that || item.soThat || '',
        components: item.components,
        storyPoint: item.story_point || item.storyPoint || 0,
        assigneeEmail: item.assignee_email || item.assigneeEmail || '',
        status: item.status,
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt,
        investWarnings: item.invest_warnings || item.investWarnings,
        investAnalysis: item.invest_analysis || item.investAnalysis,
        prs: item.prs
      };
      
      // Only add parentId if it exists
      if (item.parent_id || item.parentId) {
        newItem.parentId = item.parent_id || item.parentId;
      }
      
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: newItem
      }));
      
      migrated++;
    }
  }
  
  console.log(`Migration complete! Migrated ${migrated} stories.`);
}

migrateStories().catch(console.error);
