import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const ACCEPTANCE_TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

async function buildHierarchy(flatStories) {
  const storyMap = new Map();
  const rootStories = [];
  
  // First pass: create map and initialize children arrays
  flatStories.forEach(story => {
    story.children = [];
    storyMap.set(story.id, story);
  });
  
  // Second pass: build hierarchy
  flatStories.forEach(story => {
    const parentId = story.parent_id || story.parentId;
    if (parentId && storyMap.has(parentId)) {
      // Add to parent's children
      const parent = storyMap.get(parentId);
      parent.children.push(story);
    } else {
      // Root level story
      rootStories.push(story);
    }
  });
  
  return rootStories;
}

async function getStories() {
  const { Items } = await dynamodb.send(new ScanCommand({
    TableName: STORIES_TABLE
  }));
  
  const stories = Items || [];
  
  // Fetch acceptance tests for all stories
  const { Items: tests } = await dynamodb.send(new ScanCommand({
    TableName: ACCEPTANCE_TESTS_TABLE
  }));
  
  // Group tests by storyId
  const testsByStory = {};
  (tests || []).forEach(test => {
    const storyId = test.story_id || test.storyId;
    if (!testsByStory[storyId]) {
      testsByStory[storyId] = [];
    }
    testsByStory[storyId].push(test);
  });
  
  // Add acceptance tests to each story
  stories.forEach(story => {
    story.acceptanceTests = testsByStory[story.id] || [];
  });
  
  // Build hierarchical structure
  return buildHierarchy(stories);
}

async function test() {
  try {
    console.log('Testing getStories...');
    const stories = await getStories();
    console.log('Success! Stories count:', stories.length);
    console.log('First story:', JSON.stringify(stories[0], null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
