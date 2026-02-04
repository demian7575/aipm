#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const yaml = require('js-yaml');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

const STATUS_MAP = {
  Done: 'done',
  Ready: 'in-progress',
  Draft: 'draft'
};

async function loadHierarchy() {
  const yaml_content = fs.readFileSync('/tmp/hierarchy_with_status.yaml', 'utf8');
  return yaml.load(yaml_content);
}

async function backupDatabase() {
  console.log('📦 Backing up current database...');
  const stories = await docClient.send(new ScanCommand({ TableName: STORIES_TABLE }));
  const tests = await docClient.send(new ScanCommand({ TableName: TESTS_TABLE }));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(`/tmp/backup-stories-${timestamp}.json`, JSON.stringify(stories.Items, null, 2));
  fs.writeFileSync(`/tmp/backup-tests-${timestamp}.json`, JSON.stringify(tests.Items, null, 2));
  
  console.log(`✅ Backed up ${stories.Items.length} stories, ${tests.Items.length} tests`);
  return { stories: stories.Items, tests: tests.Items };
}

async function deleteAllStories(stories) {
  console.log('🗑️  Deleting old stories...');
  for (const story of stories) {
    await docClient.send(new DeleteCommand({ TableName: STORIES_TABLE, Key: { id: story.id } }));
  }
  console.log(`✅ Deleted ${stories.length} stories`);
}

async function deleteAllTests(tests) {
  console.log('🗑️  Deleting old tests...');
  for (const test of tests) {
    await docClient.send(new DeleteCommand({ TableName: TESTS_TABLE, Key: { id: test.id } }));
  }
  console.log(`✅ Deleted ${tests.length} tests`);
}

function createStory(id, title, status, parentId = null) {
  return {
    id,
    title,
    status: STATUS_MAP[status] || 'draft',
    description: '',
    asA: '',
    iWant: '',
    soThat: '',
    acceptanceCriteria: '',
    storyPoints: 0,
    assignee: '',
    components: [],
    dependencies: [],
    parentId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function createHierarchy(hierarchy) {
  console.log('🌳 Creating new hierarchy...');
  console.log(`Root keys: ${Object.keys(hierarchy).join(', ')}`);
  let count = 0;

  for (const [rootId, rootData] of Object.entries(hierarchy)) {
    console.log(`Creating L1: ${rootId} - ${rootData.title}`);
    try {
      await docClient.send(new PutCommand({
        TableName: STORIES_TABLE,
        Item: createStory(parseInt(rootId), rootData.title, rootData.status)
      }));
      count++;
    } catch (err) {
      console.error(`ERROR creating L1 ${rootId}:`, err.message);
      throw err;
    }

    if (rootData.children) {
      console.log(`  L2 children: ${Object.keys(rootData.children).length}`);
      for (const [l2Id, l2Data] of Object.entries(rootData.children)) {
        console.log(`  Creating L2: ${l2Id} - ${l2Data.title}`);
        await docClient.send(new PutCommand({
          TableName: STORIES_TABLE,
          Item: createStory(parseInt(l2Id), l2Data.title, l2Data.status, parseInt(rootId))
        }));
        count++;

        if (l2Data.children) {
          console.log(`    L3 children: ${Object.keys(l2Data.children).length}`);
          for (const [l3Id, l3Data] of Object.entries(l2Data.children)) {
            console.log(`    Creating L3: ${l3Id} - ${l3Data.title}`);
            await docClient.send(new PutCommand({
              TableName: STORIES_TABLE,
              Item: createStory(parseInt(l3Id), l3Data.title, l3Data.status, parseInt(l2Id))
            }));
            count++;

            if (l3Data.children && Array.isArray(l3Data.children)) {
              console.log(`      L4 children: ${l3Data.children.length}`);
              for (let i = 0; i < l3Data.children.length; i++) {
                const l4Id = parseInt(l3Id) * 10 + i + 1;
                const l4Item = l3Data.children[i];
                const l4Title = typeof l4Item === 'string' ? l4Item : l4Item.title;
                const l4Status = typeof l4Item === 'string' ? l3Data.status : l4Item.status;
                
                await docClient.send(new PutCommand({
                  TableName: STORIES_TABLE,
                  Item: createStory(l4Id, l4Title, l4Status, parseInt(l3Id))
                }));
                count++;
              }
            }
          }
        }
      }
    }
  }

  console.log(`✅ Created ${count} stories`);
}

async function main() {
  console.log('🚀 Starting database migration...\n');

  const backup = await backupDatabase();
  
  console.log('\n⚠️  WARNING: About to delete all stories and tests!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  await deleteAllTests(backup.tests);
  await deleteAllStories(backup.stories);

  const hierarchy = await loadHierarchy();
  await createHierarchy(hierarchy);

  console.log('\n✅ Migration complete!');
  console.log(`📦 Backups saved to /tmp/backup-*`);
}

main().catch(console.error);
