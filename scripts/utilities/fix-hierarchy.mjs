#!/usr/bin/env node
import { readFileSync } from 'fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';

console.log('📖 Reading stories and building hierarchy...\n');

// Get all stories
const storiesResult = await docClient.send(new ScanCommand({ TableName: STORIES_TABLE }));
const stories = storiesResult.Items;

// Build code to ID mapping
const codeToId = {};
stories.forEach(story => {
  const match = story.title.match(/(US-[A-Z]+-[A-Z]+-L\d-\d+)/);
  if (match) {
    codeToId[match[1]] = story.id;
  }
});

console.log(`Found ${stories.length} stories\n`);

// Parse parent relationships from user-stories.md
const content = readFileSync('docs/user-stories.md', 'utf-8');
const lines = content.split('\n');

const parentMap = {}; // storyCode -> parentCode
let currentStoryCode = null;

for (const line of lines) {
  if (line.startsWith('#### US-')) {
    const match = line.match(/#### (US-[A-Z]+-[A-Z]+-L\d-\d+)/);
    if (match) {
      currentStoryCode = match[1];
    }
  } else if (line.startsWith('Parent ID: ') && currentStoryCode) {
    const parentCode = line.substring(11).trim();
    if (parentCode !== 'N/A') {
      parentMap[currentStoryCode] = parentCode;
    }
  }
}

console.log(`Found ${Object.keys(parentMap).length} parent relationships\n`);

// Update stories with parentId
console.log('🔗 Updating parent relationships...');

let updated = 0;
let notFound = 0;

for (const [childCode, parentCode] of Object.entries(parentMap)) {
  const childId = codeToId[childCode];
  const parentId = codeToId[parentCode];
  
  if (childId && parentId) {
    await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: childId },
      UpdateExpression: 'SET parentId = :parentId',
      ExpressionAttributeValues: {
        ':parentId': parentId
      }
    }));
    updated++;
    
    if (updated % 50 === 0) {
      console.log(`  Progress: ${updated}/${Object.keys(parentMap).length}`);
    }
  } else {
    notFound++;
    if (!parentId) {
      console.log(`  ⚠️  Parent not found: ${parentCode} for ${childCode}`);
    }
  }
}

console.log(`  Progress: ${updated}/${Object.keys(parentMap).length}`);

console.log('\n=========================================');
console.log('Summary:');
console.log(`  ✅ Updated: ${updated} stories with parent links`);
console.log(`  ⚠️  Not found: ${notFound} parent references`);
console.log('=========================================');
