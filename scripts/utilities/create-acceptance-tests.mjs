#!/usr/bin/env node
import { readFileSync } from 'fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

console.log('📖 Reading stories from DynamoDB and user-stories.md...\n');

// Get story IDs from DynamoDB
const storiesResult = await docClient.send(new ScanCommand({ TableName: STORIES_TABLE }));
const stories = storiesResult.Items;

// Create map of story title to ID
const titleToId = {};
stories.forEach(story => {
  // Extract US-XXX-XXX-LX-NNN from title
  const match = story.title.match(/(US-[A-Z]+-[A-Z]+-L\d-\d+)/);
  if (match) {
    titleToId[match[1]] = story.id;
  }
});

console.log(`Found ${stories.length} stories in DynamoDB\n`);

// Parse user-stories.md for acceptance criteria
const content = readFileSync('docs/user-stories.md', 'utf-8');
const lines = content.split('\n');

const tests = [];
let currentStoryId = null;
let currentStoryCode = null;
let inAcceptanceCriteria = false;
let criteriaLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Story header
  if (line.startsWith('#### US-')) {
    const match = line.match(/#### (US-[A-Z]+-[A-Z]+-L\d-\d+)/);
    if (match) {
      currentStoryCode = match[1];
      currentStoryId = titleToId[currentStoryCode];
      inAcceptanceCriteria = false;
      criteriaLines = [];
    }
  }
  
  // Acceptance Criteria section
  else if (line.startsWith('Acceptance Criteria (GWT):')) {
    inAcceptanceCriteria = true;
    criteriaLines = [];
  }
  
  // Capture criteria lines
  else if (inAcceptanceCriteria && line.trim().startsWith('-')) {
    criteriaLines.push(line.trim().substring(1).trim());
  }
  else if (inAcceptanceCriteria && line.trim() && line.startsWith('  ')) {
    // Continuation line
    if (criteriaLines.length > 0) {
      criteriaLines[criteriaLines.length - 1] += ' ' + line.trim();
    }
  }
  else if (inAcceptanceCriteria && (!line.trim() || line.startsWith('####'))) {
    // End of criteria - create tests
    if (currentStoryId && criteriaLines.length > 0) {
      criteriaLines.forEach((criterion, idx) => {
        tests.push(parseCriterion(currentStoryId, currentStoryCode, criterion, idx + 1));
      });
    }
    inAcceptanceCriteria = false;
    criteriaLines = [];
  }
}

function parseCriterion(storyId, storyCode, text, index) {
  const given = [];
  const when = [];
  const then = [];
  
  // Parse Given/When/Then
  const givenMatch = text.match(/Given (.+?)(?:When|$)/i);
  const whenMatch = text.match(/When (.+?)(?:Then|$)/i);
  const thenMatch = text.match(/Then (.+?)$/i);
  
  if (givenMatch) given.push(givenMatch[1].trim());
  if (whenMatch) when.push(whenMatch[1].trim());
  if (thenMatch) then.push(thenMatch[1].trim());
  
  const title = `${storyCode} Test ${index}`;
  
  return {
    id: Date.now() + Math.floor(Math.random() * 1000000),
    storyId: parseInt(storyId),
    title,
    given: given.length > 0 ? given : ['Context exists'],
    when: when.length > 0 ? when : ['Action is performed'],
    then: then.length > 0 ? then : ['Expected result occurs'],
    status: 'Draft',
    createdAt: new Date().toISOString()
  };
}

console.log(`📝 Parsed ${tests.length} acceptance tests\n`);

if (tests.length === 0) {
  console.log('⚠️  No acceptance criteria found');
  process.exit(0);
}

// Create tests in batches
console.log('💾 Creating acceptance tests in DynamoDB...');

const testItems = tests.map(test => ({
  PutRequest: { Item: test }
}));

let created = 0;
for (let i = 0; i < testItems.length; i += 25) {
  await docClient.send(new BatchWriteCommand({
    RequestItems: {
      [TESTS_TABLE]: testItems.slice(i, i + 25)
    }
  }));
  created += Math.min(25, testItems.length - i);
  if (created % 50 === 0 || created === testItems.length) {
    console.log(`  Progress: ${created}/${testItems.length}`);
  }
}

console.log('\n=========================================');
console.log('Summary:');
console.log(`  ✅ Created: ${created} acceptance tests`);
console.log(`  📊 Stories with tests: ${new Set(tests.map(t => t.storyId)).size}`);
console.log('=========================================');
