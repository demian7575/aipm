#!/usr/bin/env node

import { readFileSync } from 'fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const PROD_STORIES_TABLE = 'aipm-backend-prod-stories';
const PROD_TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

// Get story ID mapping (old dev ID -> new prod ID)
async function getStoryMapping() {
  const devStories = JSON.parse(readFileSync('/tmp/dev-stories.json', 'utf-8'));
  const prodResponse = await dynamodb.send(new ScanCommand({ TableName: PROD_STORIES_TABLE }));
  
  const mapping = {};
  
  for (const devItem of devStories.Items) {
    const devId = devItem.id.N;
    const devTitle = devItem.title.S;
    
    // Find matching prod story by title
    const prodStory = prodResponse.Items.find(p => p.title === devTitle);
    if (prodStory) {
      mapping[devId] = prodStory.id;
    }
  }
  
  return mapping;
}

// Copy acceptance tests
async function copyAcceptanceTests(storyMapping) {
  const devTests = JSON.parse(readFileSync('/tmp/dev-tests.json', 'utf-8'));
  
  console.log(`Copying ${devTests.Items.length} acceptance tests...\n`);
  
  let copied = 0;
  for (const test of devTests.Items) {
    const oldStoryId = test.story_id?.N || test.storyId?.N;
    const newStoryId = storyMapping[oldStoryId];
    
    if (!newStoryId) continue;
    
    try {
      await dynamodb.send(new PutCommand({
        TableName: PROD_TESTS_TABLE,
        Item: {
          id: parseInt(test.id.N),
          storyId: newStoryId,
          title: test.title?.S || '',
          given: JSON.parse(test.given?.S || '[]'),
          when_step: JSON.parse(test.when_step?.S || '[]'),
          then_step: JSON.parse(test.then_step?.S || '[]'),
          status: test.status?.S || 'Draft',
          created_at: test.created_at?.S || new Date().toISOString(),
          updated_at: test.updated_at?.S || new Date().toISOString()
        }
      }));
      copied++;
    } catch (error) {
      console.error(`Failed to copy test ${test.id.N}: ${error.message}`);
    }
  }
  
  console.log(`✅ Copied ${copied} acceptance tests\n`);
}

// Update story statuses and PRs
async function updateStoryData(storyMapping) {
  const devStories = JSON.parse(readFileSync('/tmp/dev-stories.json', 'utf-8'));
  
  console.log('Updating story statuses and PRs...\n');
  
  let updated = 0;
  for (const devStory of devStories.Items) {
    const oldId = devStory.id.N;
    const newId = storyMapping[oldId];
    
    if (!newId) continue;
    
    const status = devStory.status?.S;
    const prs = devStory.prs?.S || '[]';
    
    try {
      await dynamodb.send(new UpdateCommand({
        TableName: PROD_STORIES_TABLE,
        Key: { id: newId },
        UpdateExpression: 'SET #status = :status, prs = :prs, updated_at = :updated',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':prs': prs,
          ':updated': new Date().toISOString()
        }
      }));
      updated++;
      console.log(`✅ ${devStory.title.S.substring(0, 50)} -> ${status}`);
    } catch (error) {
      console.error(`Failed to update ${devStory.title.S}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Updated ${updated} stories`);
}

async function main() {
  console.log('Getting story ID mapping...\n');
  const storyMapping = await getStoryMapping();
  console.log(`Mapped ${Object.keys(storyMapping).length} stories\n`);
  
  await copyAcceptanceTests(storyMapping);
  await updateStoryData(storyMapping);
  
  console.log('\n✨ Migration complete!');
}

main();
