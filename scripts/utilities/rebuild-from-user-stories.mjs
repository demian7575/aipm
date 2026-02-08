#!/usr/bin/env node
import { readFileSync } from 'fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

// Parse user-stories.md
const content = readFileSync('docs/user-stories.md', 'utf-8');
const lines = content.split('\n');

const stories = [];
let currentStory = null;
let inAcceptanceCriteria = false;
let inAcceptanceTests = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Story header: #### US-XXX-XXX-LX-NNN — Title [Status]
  if (line.startsWith('#### US-')) {
    if (currentStory) {
      stories.push(currentStory);
    }
    
    const match = line.match(/#### (US-[A-Z]+-[A-Z]+-L(\d)-(\d+)) — (.+?) \[(.+?)\]/);
    if (match) {
      currentStory = {
        id: match[1],
        level: parseInt(match[2]),
        sequence: parseInt(match[3]),
        title: match[4].trim(),
        status: match[5].trim(),
        parentId: null,
        asA: '',
        iWant: '',
        soThat: '',
        acceptanceCriteria: [],
        acceptanceTests: []
      };
      inAcceptanceCriteria = false;
      inAcceptanceTests = false;
    }
  }
  
  // Parent ID
  else if (line.startsWith('Parent ID: ') && currentStory) {
    const parentId = line.substring(11).trim();
    if (parentId !== 'N/A') {
      currentStory.parentId = parentId;
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
  
  // Acceptance Criteria section
  else if (line.startsWith('Acceptance Criteria (GWT):')) {
    inAcceptanceCriteria = true;
    inAcceptanceTests = false;
  }
  
  // Acceptance Tests section
  else if (line.startsWith('Acceptance Tests (GWT')) {
    inAcceptanceCriteria = false;
    inAcceptanceTests = true;
  }
  
  // Capture criteria/tests
  else if (line.startsWith('- ') && currentStory) {
    const text = line.substring(2).trim();
    if (inAcceptanceCriteria) {
      currentStory.acceptanceCriteria.push(text);
    } else if (inAcceptanceTests) {
      currentStory.acceptanceTests.push(text);
    }
  }
  
  // End of story sections
  else if (line.startsWith('####') || line.startsWith('###') || line.startsWith('##')) {
    inAcceptanceCriteria = false;
    inAcceptanceTests = false;
  }
}

if (currentStory) {
  stories.push(currentStory);
}

console.log(`📖 Parsed ${stories.length} stories from user-stories.md\n`);

// Delete existing data
console.log('🗑️  Clearing existing data...');

const existingStories = await docClient.send(new ScanCommand({ TableName: STORIES_TABLE }));
console.log(`  Found ${existingStories.Items.length} existing stories`);

if (existingStories.Items.length > 0) {
  const deleteRequests = existingStories.Items.map(item => ({
    DeleteRequest: { Key: { id: item.id } }
  }));
  
  for (let i = 0; i < deleteRequests.length; i += 25) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [STORIES_TABLE]: deleteRequests.slice(i, i + 25)
      }
    }));
  }
  console.log('  ✅ Deleted all stories');
}

const existingTests = await docClient.send(new ScanCommand({ TableName: TESTS_TABLE }));
console.log(`  Found ${existingTests.Items.length} existing tests`);

if (existingTests.Items.length > 0) {
  const deleteRequests = existingTests.Items.map(item => ({
    DeleteRequest: { Key: { id: item.id } }
  }));
  
  for (let i = 0; i < deleteRequests.length; i += 25) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TESTS_TABLE]: deleteRequests.slice(i, i + 25)
      }
    }));
  }
  console.log('  ✅ Deleted all tests\n');
}

// Create stories
console.log('📝 Creating stories...');
const storyItems = stories.map(story => ({
  PutRequest: {
    Item: {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      title: `${story.id}: ${story.title}`,
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      description: story.acceptanceCriteria.join('\n'),
      status: story.status === 'Implemented' ? 'Done' : story.status === 'Ready' ? 'Ready' : 'Draft',
      storyPoint: story.level,
      components: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
}));

let created = 0;
for (let i = 0; i < storyItems.length; i += 25) {
  await docClient.send(new BatchWriteCommand({
    RequestItems: {
      [STORIES_TABLE]: storyItems.slice(i, i + 25)
    }
  }));
  created += Math.min(25, storyItems.length - i);
  if (created % 50 === 0) {
    console.log(`  Progress: ${created}/${stories.length}`);
  }
}

console.log(`  ✅ Created ${created} stories\n`);

// Create acceptance tests
console.log('📝 Creating acceptance tests...');
const testItems = [];

stories.forEach((story, idx) => {
  const storyId = storyItems[idx].PutRequest.Item.id;
  
  story.acceptanceTests.forEach((test, testIdx) => {
    testItems.push({
      PutRequest: {
        Item: {
          id: Date.now() + Math.floor(Math.random() * 1000000),
          storyId: storyId,
          title: `Test ${testIdx + 1}: ${test.substring(0, 50)}`,
          given: [test],
          when: [],
          then: [],
          status: 'Draft',
          createdAt: new Date().toISOString()
        }
      }
    });
  });
});

let testsCreated = 0;
for (let i = 0; i < testItems.length; i += 25) {
  await docClient.send(new BatchWriteCommand({
    RequestItems: {
      [TESTS_TABLE]: testItems.slice(i, i + 25)
    }
  }));
  testsCreated += Math.min(25, testItems.length - i);
  if (testsCreated % 50 === 0) {
    console.log(`  Progress: ${testsCreated}/${testItems.length}`);
  }
}

console.log(`  ✅ Created ${testsCreated} tests\n`);

console.log('=========================================');
console.log('Summary:');
console.log(`  ✅ Stories: ${created}`);
console.log(`  ✅ Tests: ${testsCreated}`);
console.log('=========================================');
