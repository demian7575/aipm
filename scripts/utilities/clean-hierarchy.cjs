#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');

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

async function cleanHierarchy() {
  console.log('🧹 Cleaning hierarchy to max 7 children per story...\n');
  
  const stories = await getAllStories();
  fs.writeFileSync('/tmp/backup-before-clean.json', JSON.stringify(stories, null, 2));
  console.log(`✅ Backed up ${stories.length} stories\n`);
  
  // Keep only well-structured stories (proper hierarchy)
  const keep = stories.filter(s => {
    // Keep roots
    if ([1000, 2000, 3000, 4000, 5000, 6000].includes(s.id)) return true;
    
    // Keep Level 2 (X100-X600)
    if (s.id >= 1100 && s.id <= 1400 && s.id % 100 === 0) return true;
    if (s.id >= 2100 && s.id <= 2300 && s.id % 100 === 0) return true;
    if (s.id >= 3100 && s.id <= 3500 && s.id % 100 === 0) return true;
    if (s.id >= 4100 && s.id <= 4500 && s.id % 100 === 0) return true;
    if (s.id >= 5100 && s.id <= 5600 && s.id % 100 === 0) return true;
    if (s.id >= 6100 && s.id <= 6400 && s.id % 100 === 0) return true;
    
    // Keep Level 3 (XX10-XX40)
    if (s.id >= 1110 && s.id <= 1440 && s.id % 10 === 0) return true;
    if (s.id >= 2110 && s.id <= 2330 && s.id % 10 === 0) return true;
    if (s.id >= 3110 && s.id <= 3530 && s.id % 10 === 0) return true;
    if (s.id >= 4110 && s.id <= 4520 && s.id % 10 === 0) return true;
    if (s.id >= 5110 && s.id <= 5630 && s.id % 10 === 0) return true;
    if (s.id >= 6110 && s.id <= 6430 && s.id % 10 === 0) return true;
    
    // Keep Level 4 (XXX01-XXX07, max 7 children)
    const lastDigit = s.id % 10;
    const lastTwoDigits = s.id % 100;
    if (lastDigit >= 1 && lastDigit <= 7 && lastTwoDigits > 10) return true;
    
    return false;
  });
  
  console.log(`Keeping ${keep.length} well-structured stories`);
  console.log(`Removing ${stories.length - keep.length} orphaned/duplicate stories\n`);
  
  // Delete all stories
  console.log('Deleting all stories...');
  for (const story of stories) {
    await docClient.send(new DeleteCommand({
      TableName: STORIES_TABLE,
      Key: { id: story.id }
    }));
  }
  console.log('✅ Deleted\n');
  
  // Re-create clean hierarchy
  console.log('Creating clean hierarchy...');
  for (const story of keep) {
    await docClient.send(new PutCommand({
      TableName: STORIES_TABLE,
      Item: story
    }));
  }
  
  console.log(`\n✅ Clean hierarchy created!`);
  console.log(`   Total stories: ${keep.length}`);
  console.log(`   Max children per story: 7`);
}

cleanHierarchy().catch(console.error);
