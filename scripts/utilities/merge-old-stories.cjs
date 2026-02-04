#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

async function getCurrentStories() {
  const result = await docClient.send(new ScanCommand({ TableName: STORIES_TABLE }));
  return result.Items || [];
}

async function getOldStories() {
  const backupFile = '/tmp/backup-stories-2026-02-04T08-08-14-929Z.json';
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  return data;
}

async function getOldTests() {
  const files = fs.readdirSync('/tmp').filter(f => f.startsWith('backup-tests-2026-02-04'));
  if (files.length === 0) return [];
  const latest = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(`/tmp/${latest}`, 'utf8'));
  return data;
}

function normalizeTitle(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function findMatchingStory(oldStory, currentStories) {
  const oldNorm = normalizeTitle(oldStory.title);
  return currentStories.find(s => normalizeTitle(s.title) === oldNorm);
}

async function main() {
  console.log('🔄 Merging old stories into new hierarchy...\n');

  const currentStories = await getCurrentStories();
  const oldStories = await getOldStories();
  const oldTests = await getOldTests();

  console.log(`📊 Current stories: ${currentStories.length}`);
  console.log(`📊 Old stories: ${oldStories.length}`);
  console.log(`📊 Old tests: ${oldTests.length}\n`);

  let replaced = 0;
  let migrated = 0;
  let skipped = 0;

  for (const oldStory of oldStories) {
    const match = findMatchingStory(oldStory, currentStories);
    
    if (match) {
      // Replace current story with old story data (keep new ID and parentId)
      const merged = {
        ...oldStory,
        id: match.id,
        parentId: match.parentId,
        updatedAt: Date.now()
      };
      
      await docClient.send(new PutCommand({
        TableName: STORIES_TABLE,
        Item: merged
      }));
      
      console.log(`✅ Replaced: ${match.id} - ${match.title}`);
      replaced++;
    } else {
      // Find best parent by matching keywords
      let parentId = null;
      const title = oldStory.title.toLowerCase();
      
      if (title.includes('story') || title.includes('requirement')) parentId = 1000;
      else if (title.includes('document') || title.includes('report')) parentId = 2000;
      else if (title.includes('mindmap') || title.includes('kanban') || title.includes('view')) parentId = 3000;
      else if (title.includes('ai') || title.includes('kiro') || title.includes('generate')) parentId = 4000;
      else if (title.includes('github') || title.includes('deploy') || title.includes('pr')) parentId = 5000;
      else if (title.includes('test') || title.includes('quality') || title.includes('gating')) parentId = 6000;
      else parentId = 1000; // Default to Requirement Management
      
      const newStory = {
        ...oldStory,
        parentId,
        updatedAt: Date.now()
      };
      
      await docClient.send(new PutCommand({
        TableName: STORIES_TABLE,
        Item: newStory
      }));
      
      console.log(`➕ Migrated: ${oldStory.id} - ${oldStory.title} (parent: ${parentId})`);
      migrated++;
    }
  }

  // Restore acceptance tests
  console.log('\n📝 Restoring acceptance tests...');
  for (const test of oldTests) {
    await docClient.send(new PutCommand({
      TableName: TESTS_TABLE,
      Item: test
    }));
  }

  console.log(`\n✅ Merge complete!`);
  console.log(`   Replaced: ${replaced}`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Tests restored: ${oldTests.length}`);
}

main().catch(console.error);
