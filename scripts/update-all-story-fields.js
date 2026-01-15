import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';

// Parse documents/user-stories.md
const content = readFileSync('./documents/user-stories.md', 'utf8');
const lines = content.split('\n');

const storyData = {};
let currentId = null;
let asA = null;
let iWant = null;
let soThat = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Match story ID: US-0101 — Title
  if (line.match(/^US-\d+/)) {
    // Save previous story
    if (currentId && (asA || iWant || soThat)) {
      storyData[currentId] = { as_a: asA, i_want: iWant, so_that: soThat };
    }
    
    const match = line.match(/^US-(\d+)/);
    currentId = parseInt(match[1]);
    asA = null;
    iWant = null;
    soThat = null;
  }
  // Match "As a ..."
  else if (line.startsWith('As a ')) {
    asA = line.substring(5).trim();
  }
  // Match "I want ..."
  else if (line.startsWith('I want ')) {
    iWant = line.substring(7).trim();
  }
  // Match "So that ..."
  else if (line.startsWith('So that ')) {
    soThat = line.substring(8).trim();
  }
}

// Save last story
if (currentId && (asA || iWant || soThat)) {
  storyData[currentId] = { as_a: asA, i_want: iWant, so_that: soThat };
}

console.log(`📚 Parsed ${Object.keys(storyData).length} stories from document`);

// Get all stories from DB
const { Items: stories } = await dynamodb.send(new ScanCommand({
  TableName: STORIES_TABLE
}));

console.log(`📊 Found ${stories.length} stories in database`);

// Update stories
let updated = 0;
for (const story of stories) {
  const data = storyData[story.id];
  if (data) {
    await dynamodb.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: story.id },
      UpdateExpression: 'SET as_a = :as_a, i_want = :i_want, so_that = :so_that, updated_at = :updated',
      ExpressionAttributeValues: {
        ':as_a': data.as_a || '',
        ':i_want': data.i_want || '',
        ':so_that': data.so_that || '',
        ':updated': new Date().toISOString()
      }
    }));
    console.log(`✅ Updated story ${story.id}: ${story.title}`);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} stories`);
