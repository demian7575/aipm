import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const ACCEPTANCE_TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

console.log('🗑️  Step 1: Deleting all existing data...');

// Delete all stories
const { Items: stories } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));
for (const story of stories) {
  await dynamodb.send(new DeleteCommand({ TableName: STORIES_TABLE, Key: { id: story.id } }));
}
console.log(`✅ Deleted ${stories.length} stories`);

// Delete all acceptance tests
const { Items: tests } = await dynamodb.send(new ScanCommand({ TableName: ACCEPTANCE_TESTS_TABLE }));
for (const test of tests) {
  await dynamodb.send(new DeleteCommand({ TableName: ACCEPTANCE_TESTS_TABLE, Key: { id: test.id } }));
}
console.log(`✅ Deleted ${tests.length} acceptance tests`);

console.log('\n📚 Step 2: Parsing documents/user-stories.md...');

const content = readFileSync('./documents/user-stories.md', 'utf8');
const lines = content.split('\n');

const storiesData = [];
const testsData = [];

let currentStory = null;
let currentTest = null;
let testGiven = [];
let testWhen = [];
let testThen = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Root category: # Root N: Title
  if (line.match(/^# Root \d+:/)) {
    const match = line.match(/^# Root (\d+): (.+)$/);
    const id = parseInt(match[1]) * 1000;
    currentStory = {
      id,
      title: match[2].trim(),
      parent_id: null,
      description: '',
      as_a: '',
      i_want: '',
      so_that: '',
      status: 'Draft',
      story_point: 0,
      components: ['WorkModel'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    storiesData.push(currentStory);
    currentTest = null;
  }
  // Sub-category: ## N.M Title
  else if (line.match(/^## \d+\.\d+ /)) {
    const match = line.match(/^## (\d+)\.(\d+) (.+)$/);
    const rootNum = parseInt(match[1]);
    const subNum = parseInt(match[2]);
    const id = rootNum * 1000 + subNum * 10;
    currentStory = {
      id,
      title: match[3].trim(),
      parent_id: rootNum * 1000,
      description: '',
      as_a: '',
      i_want: '',
      so_that: '',
      status: 'Draft',
      story_point: 0,
      components: ['WorkModel'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    storiesData.push(currentStory);
    currentTest = null;
  }
  // Leaf story: US-NNNN — Title
  else if (line.match(/^US-\d+ —/)) {
    // Save previous test if exists
    if (currentTest) {
      currentTest.given = testGiven;
      currentTest.when_step = testWhen;
      currentTest.then_step = testThen;
      testsData.push(currentTest);
      currentTest = null;
    }
    
    const match = line.match(/^US-(\d+) — (.+)$/);
    const storyId = parseInt(match[1]);
    currentStory = {
      id: storyId,
      title: match[2].trim(),
      parent_id: null, // Will be set based on document structure
      description: '',
      as_a: '',
      i_want: '',
      so_that: '',
      status: 'Draft',
      story_point: 0,
      components: ['WorkModel'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    storiesData.push(currentStory);
    testGiven = [];
    testWhen = [];
    testThen = [];
  }
  // Story fields
  else if (currentStory && line.startsWith('As a ')) {
    currentStory.as_a = line.substring(5).trim();
  }
  else if (currentStory && line.startsWith('I want ')) {
    currentStory.i_want = line.substring(7).trim();
  }
  else if (currentStory && line.startsWith('So that ')) {
    currentStory.so_that = line.substring(8).trim();
  }
  // Acceptance test section
  else if (line.match(/^Acceptance \(GWT\)/)) {
    if (currentTest) {
      // Save previous test
      currentTest.given = testGiven;
      currentTest.when_step = testWhen;
      currentTest.then_step = testThen;
      testsData.push(currentTest);
    }
    currentTest = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      story_id: currentStory.id,
      title: `Acceptance test for US-${String(currentStory.id).padStart(4, '0')}`,
      status: 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    testGiven = [];
    testWhen = [];
    testThen = [];
  }
  else if (currentTest && line.startsWith('Given ')) {
    testGiven.push(line.substring(6).trim());
  }
  else if (currentTest && line.startsWith('When ')) {
    testWhen.push(line.substring(5).trim());
  }
  else if (currentTest && line.startsWith('Then ')) {
    testThen.push(line.substring(5).trim());
  }
  else if (currentTest && line.startsWith('And ')) {
    const andClause = line.substring(4).trim();
    if (testThen.length > 0) {
      testThen.push(andClause);
    } else if (testWhen.length > 0) {
      testWhen.push(andClause);
    } else if (testGiven.length > 0) {
      testGiven.push(andClause);
    }
  }
}

// Save last test
if (currentTest) {
  currentTest.given = testGiven;
  currentTest.when_step = testWhen;
  currentTest.then_step = testThen;
  testsData.push(currentTest);
}

// Set parent_id for leaf stories based on hierarchy
for (let i = 0; i < storiesData.length; i++) {
  const story = storiesData[i];
  if (story.id < 1000) {
    // Leaf story - find its parent
    for (let j = i - 1; j >= 0; j--) {
      if (storiesData[j].id >= 1000 && storiesData[j].id < 10000) {
        story.parent_id = storiesData[j].id;
        break;
      }
    }
  }
}

console.log(`📊 Parsed ${storiesData.length} stories and ${testsData.length} acceptance tests`);

console.log('\n💾 Step 3: Creating stories in DynamoDB...');
for (const story of storiesData) {
  await dynamodb.send(new PutCommand({ TableName: STORIES_TABLE, Item: story }));
}
console.log(`✅ Created ${storiesData.length} stories`);

console.log('\n💾 Step 4: Creating acceptance tests in DynamoDB...');
for (const test of testsData) {
  await dynamodb.send(new PutCommand({ TableName: ACCEPTANCE_TESTS_TABLE, Item: test }));
}
console.log(`✅ Created ${testsData.length} acceptance tests`);

console.log('\n✅ Database rebuild complete!');
console.log(`   - ${storiesData.filter(s => s.parent_id === null).length} root stories`);
console.log(`   - ${storiesData.filter(s => s.parent_id !== null && s.id >= 1000).length} sub-categories`);
console.log(`   - ${storiesData.filter(s => s.id < 1000).length} leaf stories`);
console.log(`   - ${testsData.length} acceptance tests`);
