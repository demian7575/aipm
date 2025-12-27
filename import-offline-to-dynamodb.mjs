#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const ACCEPTANCE_TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

async function importOfflineData() {
  console.log('📥 Loading offline data...');
  
  // Create the correct offline dataset with 45+ stories including Development Task story
  const sqliteData = JSON.parse(readFileSync('docs/examples/app.sqlite.json', 'utf8'));
  let stories = sqliteData.tables.user_stories || [];
  let acceptanceTests = sqliteData.tables.acceptance_tests || [];
  
  // Replace the first story with the Development Task story we've been testing
  stories[0] = {
    id: 1,
    parent_id: null,
    title: 'Clean Development Task Interface',
    description: 'Simplify the Development Task interface by removing unnecessary branch management complexity to provide a clean and focused task management experience.',
    as_a: 'Developer',
    i_want: 'to remove Branch, PR created, and Rebase links from the Development Task interface',
    so_that: 'I can have a simple and clean task management interface without unnecessary branch management complexity',
    components: '["System"]',
    story_points: 8,
    assignee: 'dev@aipm.dev',
    status: 'Done',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  // Add acceptance test for the Development Task story
  acceptanceTests.unshift({
    id: 1,
    story_id: 1,
    title: 'Development Task interface is clean',
    given: 'I am viewing a Development Task card',
    when_step: 'I look at the available actions',
    then_step: 'I should not see Branch, PR created, or Rebase links',
    status: 'Pass',
    created_at: Date.now(),
    updated_at: Date.now()
  });
  
  console.log(`Using offline dataset with ${stories.length} stories including Development Task story`);
  
  console.log(`Found ${stories.length} stories and ${acceptanceTests.length} acceptance tests`);
  
  // Clear existing DynamoDB data
  console.log('🗑️ Clearing existing DynamoDB data...');
  await clearTable(STORIES_TABLE);
  await clearTable(ACCEPTANCE_TESTS_TABLE);
  
  // Import stories
  console.log('📊 Importing stories...');
  for (const story of stories) {
    const item = {
      id: story.id,
      parent_id: story.parent_id,
      title: story.title,
      description: story.description || '',
      as_a: story.as_a || '',
      i_want: story.i_want || '',
      so_that: story.so_that || '',
      components: Array.isArray(story.components) ? story.components : JSON.parse(story.components || '[]'),
      story_points: story.story_points || 0,
      assignee: story.assignee || '',
      status: story.status || 'Draft',
      created_at: story.created_at || Date.now(),
      updated_at: story.updated_at || Date.now()
    };
    
    await docClient.send(new PutCommand({
      TableName: STORIES_TABLE,
      Item: item
    }));
  }
  
  // Import acceptance tests
  console.log('✅ Importing acceptance tests...');
  for (const test of acceptanceTests) {
    const item = {
      id: test.id,
      storyId: test.story_id,
      title: test.title || '',
      given: test.given || '',
      when_step: test.when_step || '',
      then_step: test.then_step || '',
      status: test.status || 'Draft',
      created_at: test.created_at || Date.now(),
      updated_at: test.updated_at || Date.now()
    };
    
    await docClient.send(new PutCommand({
      TableName: ACCEPTANCE_TESTS_TABLE,
      Item: item
    }));
  }
  
  console.log(`✅ Import complete! ${stories.length} stories and ${acceptanceTests.length} tests imported.`);
}

async function clearTable(tableName) {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: tableName }));
    
    for (const item of result.Items || []) {
      await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { id: item.id }
      }));
    }
    
    console.log(`Cleared ${result.Items?.length || 0} items from ${tableName}`);
  } catch (error) {
    console.log(`Table ${tableName} might not exist or be empty:`, error.message);
  }
}

importOfflineData().catch(console.error);
