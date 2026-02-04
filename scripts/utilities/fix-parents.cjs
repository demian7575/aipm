#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';

async function getAllStories() {
  let items = [];
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: STORIES_TABLE,
      ExclusiveStartKey: lastKey
    }));
    items = items.concat(result.Items || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function fixParents() {
  console.log('🔧 Fixing parent relationships...\n');
  
  const stories = await getAllStories();
  let fixed = 0;
  
  for (const story of stories) {
    // Skip roots
    if ([1000, 2000, 3000, 4000, 5000, 6000].includes(story.id)) continue;
    
    // Level 2 stories (X100, X200, etc.) should have root parent
    if (story.id % 100 === 0) {
      const rootParent = Math.floor(story.id / 1000) * 1000;
      if (story.parentId !== rootParent) {
        await docClient.send(new UpdateCommand({
          TableName: STORIES_TABLE,
          Key: { id: story.id },
          UpdateExpression: 'SET parentId = :p',
          ExpressionAttributeValues: { ':p': rootParent }
        }));
        console.log(`✅ ${story.id} -> parent: ${rootParent}`);
        fixed++;
      }
      continue;
    }
    
    // Level 3 stories (XX10, XX20, etc.) should have Level 2 parent
    if (story.id % 10 === 0) {
      const level2Parent = Math.floor(story.id / 100) * 100;
      if (story.parentId !== level2Parent) {
        await docClient.send(new UpdateCommand({
          TableName: STORIES_TABLE,
          Key: { id: story.id },
          UpdateExpression: 'SET parentId = :p',
          ExpressionAttributeValues: { ':p': level2Parent }
        }));
        console.log(`✅ ${story.id} -> parent: ${level2Parent}`);
        fixed++;
      }
      continue;
    }
    
    // Level 4+ stories should have Level 3 parent
    const level3Parent = Math.floor(story.id / 10) * 10;
    if (story.parentId !== level3Parent) {
      await docClient.send(new UpdateCommand({
        TableName: STORIES_TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parentId = :p',
        ExpressionAttributeValues: { ':p': level3Parent }
      }));
      console.log(`✅ ${story.id} -> parent: ${level3Parent}`);
      fixed++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} parent relationships`);
}

fixParents().catch(console.error);
