#!/usr/bin/env node
import { readFileSync } from 'fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

console.log('📖 Parsing user-stories.md...\n');

const content = readFileSync('docs/user-stories.md', 'utf-8');
const lines = content.split('\n');

const allStories = [];
let currentL1 = null;
let currentL2 = null;
let currentStory = null;
let inAcceptanceCriteria = false;
let criteriaLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // L1 Root: ## N. Title
  if (line.match(/^## \d+\. /)) {
    const match = line.match(/^## (\d+)\. (.+)/);
    if (match) {
      currentL1 = {
        level: 1,
        number: parseInt(match[1]),
        title: match[2].trim(),
        code: null,
        parentCode: null
      };
      allStories.push(currentL1);
      currentL2 = null;
    }
  }
  
  // L2 Subcategory: ### N.N Title
  else if (line.match(/^### \d+\.\d+ /)) {
    const match = line.match(/^### (\d+)\.(\d+) (.+)/);
    if (match && currentL1) {
      currentL2 = {
        level: 2,
        number: `${match[1]}.${match[2]}`,
        title: match[3].trim(),
        code: null,
        parentCode: null,
        parentRef: currentL1
      };
      allStories.push(currentL2);
    }
  }
  
  // L3-L6 Stories: #### US-XXX-XXX-LX-NNN
  else if (line.startsWith('#### US-')) {
    if (currentStory && criteriaLines.length > 0) {
      currentStory.acceptanceCriteria = criteriaLines;
    }
    
    const match = line.match(/#### (US-[A-Z]+-[A-Z]+-L(\d)-\d+) — (.+?) \[(.+?)\]/);
    if (match) {
      currentStory = {
        level: parseInt(match[2]),
        code: match[1],
        title: match[3].trim(),
        status: match[4].trim(),
        parentCode: null,
        parentRef: currentL2,
        asA: '',
        iWant: '',
        soThat: '',
        acceptanceCriteria: []
      };
      allStories.push(currentStory);
      inAcceptanceCriteria = false;
      criteriaLines = [];
    }
  }
  
  // Parent ID
  else if (line.startsWith('Parent ID: ') && currentStory) {
    const parentCode = line.substring(11).trim();
    if (parentCode !== 'N/A') {
      currentStory.parentCode = parentCode;
    }
  }
  
  // As a / I want / So that
  else if (line.startsWith('As a ') && currentStory) {
    currentStory.asA = line.substring(5).trim();
  }
  else if (line.startsWith('I want ') && currentStory) {
    currentStory.iWant = line.substring(7).trim();
  }
  else if (line.startsWith('So that ') && currentStory) {
    currentStory.soThat = line.substring(8).trim();
  }
  
  // Acceptance Criteria
  else if (line.startsWith('Acceptance Criteria (GWT):')) {
    inAcceptanceCriteria = true;
    criteriaLines = [];
  }
  else if (inAcceptanceCriteria && line.trim().startsWith('-')) {
    criteriaLines.push(line.trim().substring(1).trim());
  }
  else if (inAcceptanceCriteria && line.trim() && line.startsWith('  ')) {
    if (criteriaLines.length > 0) {
      criteriaLines[criteriaLines.length - 1] += ' ' + line.trim();
    }
  }
  else if (inAcceptanceCriteria && (!line.trim() || line.startsWith('####'))) {
    inAcceptanceCriteria = false;
  }
}

console.log(`Parsed ${allStories.length} total items\n`);

// Count by level
const byLevel = {};
allStories.forEach(s => {
  byLevel[s.level] = (byLevel[s.level] || 0) + 1;
});

console.log('📊 Distribution:');
Object.entries(byLevel).sort((a, b) => a[0] - b[0]).forEach(([level, count]) => {
  console.log(`  L${level}: ${count} items`);
});
console.log('');

// Delete existing data
console.log('🗑️  Clearing existing data...');
const existing = await docClient.send(new ScanCommand({ TableName: STORIES_TABLE }));
if (existing.Items.length > 0) {
  const deletes = existing.Items.map(item => ({ DeleteRequest: { Key: { id: item.id } } }));
  for (let i = 0; i < deletes.length; i += 25) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: { [STORIES_TABLE]: deletes.slice(i, i + 25) }
    }));
  }
  console.log(`  ✅ Deleted ${existing.Items.length} stories`);
}

const existingTests = await docClient.send(new ScanCommand({ TableName: TESTS_TABLE }));
if (existingTests.Items.length > 0) {
  const deletes = existingTests.Items.map(item => ({ DeleteRequest: { Key: { id: item.id } } }));
  for (let i = 0; i < deletes.length; i += 25) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: { [TESTS_TABLE]: deletes.slice(i, i + 25) }
    }));
  }
  console.log(`  ✅ Deleted ${existingTests.Items.length} tests\n`);
}

// Create stories with IDs
console.log('📝 Creating stories with hierarchy...');

const codeToId = {};
const refToId = {};

// First pass: create all stories and build ID maps
const storyItems = [];
for (const story of allStories) {
  const id = Date.now() + Math.floor(Math.random() * 1000000);
  
  if (story.code) {
    codeToId[story.code] = id;
  }
  if (story.level <= 2) {
    refToId[story] = id;
  }
  
  const title = story.code ? `${story.code}: ${story.title}` : story.title;
  
  storyItems.push({
    PutRequest: {
      Item: {
        id,
        title,
        asA: story.asA || 'product manager',
        iWant: story.iWant || `to ${story.title.toLowerCase()}`,
        soThat: story.soThat || 'I can manage requirements effectively',
        description: story.acceptanceCriteria ? story.acceptanceCriteria.join('\n') : '',
        status: story.status === 'Implemented' ? 'Done' : story.status === 'Ready' ? 'Ready' : 'Draft',
        storyPoint: story.level || 0,
        components: [],
        parentId: null, // Will update in second pass
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  });
}

// Write stories
let created = 0;
for (let i = 0; i < storyItems.length; i += 25) {
  await docClient.send(new BatchWriteCommand({
    RequestItems: { [STORIES_TABLE]: storyItems.slice(i, i + 25) }
  }));
  created += Math.min(25, storyItems.length - i);
  if (created % 50 === 0) {
    console.log(`  Progress: ${created}/${storyItems.length}`);
  }
}
console.log(`  ✅ Created ${created} stories\n`);

// Second pass: update parent relationships
console.log('🔗 Updating parent relationships...');

let updated = 0;
for (let i = 0; i < allStories.length; i++) {
  const story = allStories[i];
  const storyId = storyItems[i].PutRequest.Item.id;
  let parentId = null;
  
  // Find parent ID
  if (story.parentCode) {
    parentId = codeToId[story.parentCode];
  } else if (story.parentRef) {
    parentId = refToId[story.parentRef];
  }
  
  if (parentId) {
    await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: storyId },
      UpdateExpression: 'SET parentId = :parentId',
      ExpressionAttributeValues: { ':parentId': parentId }
    }));
    updated++;
    
    if (updated % 50 === 0) {
      console.log(`  Progress: ${updated}`);
    }
  }
}
console.log(`  ✅ Updated ${updated} parent links\n`);

console.log('=========================================');
console.log('Summary:');
console.log(`  ✅ Stories: ${created}`);
console.log(`  ✅ Parent links: ${updated}`);
console.log('=========================================');
