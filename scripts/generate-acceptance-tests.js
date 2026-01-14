#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

function generateTests(story) {
  const tests = [];
  const baseId = Date.now();
  
  // Test 1: Basic functionality
  tests.push({
    id: baseId + Math.floor(Math.random() * 1000),
    storyId: story.id,
    title: `Verify ${story.title.substring(0, 50)} functionality`,
    given: [`the system is ready`, `user has access to the feature`],
    when_step: [`user performs the action described in "${story.title.substring(0, 40)}"`],
    then_step: [`the expected behavior occurs`, `no errors are displayed`],
    status: 'Draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  // Test 2: Edge case or validation
  if (story.title.match(/create|add|generate|update|edit/i)) {
    tests.push({
      id: baseId + 1000 + Math.floor(Math.random() * 1000),
      storyId: story.id,
      title: `Validate input for ${story.title.substring(0, 40)}`,
      given: [`the feature is accessible`, `user attempts to use the feature`],
      when_step: [`user provides valid input`, `user submits the action`],
      then_step: [`the system validates the input`, `appropriate feedback is shown`],
      status: 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } else if (story.title.match(/display|show|view|list/i)) {
    tests.push({
      id: baseId + 1000 + Math.floor(Math.random() * 1000),
      storyId: story.id,
      title: `Verify display accuracy for ${story.title.substring(0, 40)}`,
      given: [`data exists in the system`, `user navigates to the view`],
      when_step: [`the view loads`],
      then_step: [`all expected information is displayed`, `the layout is correct`],
      status: 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return tests;
}

async function main() {
  // Get all stories
  const storiesResponse = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));
  const stories = storiesResponse.Items;
  
  // Get existing tests
  const testsResponse = await dynamodb.send(new ScanCommand({ TableName: TESTS_TABLE }));
  const existingTests = testsResponse.Items;
  
  // Find stories without tests
  const storiesWithTests = new Set(existingTests.map(t => t.storyId));
  const storiesNeedingTests = stories.filter(s => !storiesWithTests.has(s.id));
  
  console.log(`Found ${storiesNeedingTests.length} stories without acceptance tests\n`);
  
  let created = 0;
  for (const story of storiesNeedingTests) {
    const tests = generateTests(story);
    
    for (const test of tests) {
      try {
        await dynamodb.send(new PutCommand({
          TableName: TESTS_TABLE,
          Item: test
        }));
        created++;
        console.log(`✅ ${story.title.substring(0, 50)}: ${test.title.substring(0, 40)}`);
      } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
      }
    }
  }
  
  console.log(`\n✨ Created ${created} acceptance tests for ${storiesNeedingTests.length} stories`);
}

main();
